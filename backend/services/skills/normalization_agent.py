"""Skill Normalization Agent — LangGraph workflow.

This agent:
1. Takes raw extracted skills from a resume
2. Maps each skill to a canonical taxonomy entry (handling synonyms/abbreviations)
3. Infers implied skills via hierarchy rules
4. Estimates proficiency levels from context
5. Flags unknown skills as emerging for human review
"""

from __future__ import annotations

import logging
import uuid
from typing import TypedDict

from langgraph.graph import StateGraph, END
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import AsyncSessionLocal
from backend.models.skill_taxonomy import (
    Skill, SkillSynonym, SkillHierarchyRule, EmergingSkill, SkillCategory,
)

logger = logging.getLogger(__name__)


# ── Canonical synonym lookup table (in-memory cache) ──────────────────

_BUILTIN_SYNONYMS: dict[str, str] = {
    # JavaScript variants
    "js": "JavaScript", "javascript": "JavaScript", "es6": "JavaScript",
    "es2015": "JavaScript", "ecmascript": "JavaScript",
    # TypeScript
    "ts": "TypeScript", "typescript": "TypeScript",
    # React
    "react.js": "React", "reactjs": "React", "react js": "React",
    "react native": "React Native",
    # Node
    "node.js": "Node.js", "nodejs": "Node.js", "node": "Node.js",
    # Python
    "py": "Python", "python3": "Python", "python 3": "Python",
    # Kubernetes
    "k8s": "Kubernetes", "kube": "Kubernetes",
    # Docker
    "containerization": "Docker",
    # Databases
    "postgres": "PostgreSQL", "pg": "PostgreSQL", "postgresql": "PostgreSQL",
    "mongo": "MongoDB", "mongodb": "MongoDB",
    "mysql": "MySQL", "my sql": "MySQL",
    "mssql": "SQL Server", "ms sql": "SQL Server",
    # Cloud
    "aws": "Amazon Web Services", "amazon web services": "Amazon Web Services",
    "gcp": "Google Cloud Platform", "google cloud": "Google Cloud Platform",
    "azure": "Microsoft Azure", "ms azure": "Microsoft Azure",
    # ML/AI
    "ml": "Machine Learning", "machine learning": "Machine Learning",
    "dl": "Deep Learning", "deep learning": "Deep Learning",
    "ai": "Artificial Intelligence", "artificial intelligence": "Artificial Intelligence",
    "nlp": "Natural Language Processing", "natural language processing": "Natural Language Processing",
    "cv": "Computer Vision", "computer vision": "Computer Vision",
    "llm": "Large Language Models", "large language models": "Large Language Models",
    "genai": "Generative AI", "gen ai": "Generative AI",
    # Frameworks
    "tf": "TensorFlow", "tensorflow": "TensorFlow",
    "pytorch": "PyTorch", "torch": "PyTorch",
    "scikit-learn": "Scikit-learn", "sklearn": "Scikit-learn",
    "fastapi": "FastAPI", "fast api": "FastAPI",
    "django": "Django", "drf": "Django REST Framework",
    "flask": "Flask",
    "express": "Express.js", "express.js": "Express.js", "expressjs": "Express.js",
    "next.js": "Next.js", "nextjs": "Next.js",
    "vue.js": "Vue.js", "vuejs": "Vue.js", "vue": "Vue.js",
    "angular.js": "Angular", "angularjs": "Angular",
    # DevOps / CI/CD
    "ci/cd": "CI/CD", "cicd": "CI/CD",
    "gh actions": "GitHub Actions", "github actions": "GitHub Actions",
    "jenkins": "Jenkins",
    "terraform": "Terraform", "tf (infra)": "Terraform",
    # Data / Analytics
    "sql": "SQL", "structured query language": "SQL",
    "nosql": "NoSQL", "no-sql": "NoSQL",
    "etl": "ETL", "data pipeline": "ETL",
    "spark": "Apache Spark", "pyspark": "PySpark",
    "hadoop": "Hadoop",
    "tableau": "Tableau", "power bi": "Power BI", "powerbi": "Power BI",
    # Version control
    "git": "Git", "github": "GitHub", "gitlab": "GitLab",
    # Agile
    "scrum": "Scrum", "kanban": "Kanban", "agile": "Agile",
    # Communication
    "rest": "REST APIs", "restful": "REST APIs", "rest api": "REST APIs",
    "graphql": "GraphQL", "grpc": "gRPC",
}


# ── Hierarchy inference rules (skill → implies parent skill) ──────────

_BUILTIN_HIERARCHY: dict[str, list[str]] = {
    "TensorFlow": ["Deep Learning", "Machine Learning", "Python"],
    "PyTorch": ["Deep Learning", "Machine Learning", "Python"],
    "Scikit-learn": ["Machine Learning", "Python"],
    "Keras": ["Deep Learning", "Machine Learning", "Python"],
    "React": ["Frontend Development", "JavaScript"],
    "Vue.js": ["Frontend Development", "JavaScript"],
    "Angular": ["Frontend Development", "TypeScript"],
    "Next.js": ["Full Stack Development", "React", "JavaScript"],
    "Django": ["Backend Development", "Python"],
    "FastAPI": ["Backend Development", "Python"],
    "Flask": ["Backend Development", "Python"],
    "Express.js": ["Backend Development", "Node.js", "JavaScript"],
    "Node.js": ["Backend Development", "JavaScript"],
    "Docker": ["DevOps", "Containerization"],
    "Kubernetes": ["DevOps", "Container Orchestration", "Docker"],
    "Terraform": ["DevOps", "Infrastructure as Code"],
    "Amazon Web Services": ["Cloud Computing"],
    "Google Cloud Platform": ["Cloud Computing"],
    "Microsoft Azure": ["Cloud Computing"],
    "PostgreSQL": ["Databases", "SQL"],
    "MongoDB": ["Databases", "NoSQL"],
    "Redis": ["Databases", "Caching"],
    "Apache Spark": ["Big Data", "Data Engineering"],
    "PySpark": ["Big Data", "Data Engineering", "Python"],
    "Natural Language Processing": ["Machine Learning", "Artificial Intelligence"],
    "Computer Vision": ["Deep Learning", "Artificial Intelligence"],
    "Large Language Models": ["Artificial Intelligence", "Deep Learning"],
    "Generative AI": ["Artificial Intelligence", "Large Language Models"],
    "GraphQL": ["API Development"],
    "REST APIs": ["API Development"],
    "CI/CD": ["DevOps"],
    "GitHub Actions": ["CI/CD", "DevOps"],
    "Jenkins": ["CI/CD", "DevOps"],
}


# ── Proficiency level estimation ──────────────────────────────────────

_EXPERIENCE_KEYWORDS = {
    "expert": 5, "advanced": 4, "proficient": 4, "senior": 4,
    "experienced": 3, "intermediate": 3, "familiar": 2,
    "basic": 1, "beginner": 1, "learning": 1, "exposure": 1,
}


class NormalizationState(TypedDict, total=False):
    """State for the skill normalization pipeline."""
    raw_skills: list[str]
    experience_entries: list[dict]  # work experience for context
    years_experience: float | None
    # Pipeline outputs
    normalized_skills: list[dict]     # canonical skills with proficiency
    inferred_skills: list[dict]       # skills inferred from hierarchy
    emerging_skills: list[str]        # unknown skills flagged for review
    skill_profile: dict               # final structured profile
    error: str | None


def normalize_skills_node(state: NormalizationState) -> dict:
    """Normalize raw skills against the taxonomy using synonym mapping."""
    raw_skills = state.get("raw_skills", [])
    normalized = []
    unknown = []

    for raw in raw_skills:
        raw_lower = raw.lower().strip()
        canonical = _BUILTIN_SYNONYMS.get(raw_lower)
        if canonical:
            normalized.append({
                "canonical_name": canonical,
                "original_name": raw,
                "match_type": "synonym",
            })
        elif raw_lower in {v.lower() for v in _BUILTIN_SYNONYMS.values()}:
            # Already canonical
            canonical = next(
                v for v in _BUILTIN_SYNONYMS.values() if v.lower() == raw_lower
            )
            normalized.append({
                "canonical_name": canonical,
                "original_name": raw,
                "match_type": "exact",
            })
        else:
            # Try fuzzy matching against known canonicals
            from thefuzz import fuzz
            best_match = None
            best_score = 0
            all_canonicals = set(_BUILTIN_SYNONYMS.values())
            for canon in all_canonicals:
                score = fuzz.token_sort_ratio(raw_lower, canon.lower())
                if score > best_score and score >= 80:
                    best_score = score
                    best_match = canon

            if best_match:
                normalized.append({
                    "canonical_name": best_match,
                    "original_name": raw,
                    "match_type": "fuzzy",
                    "confidence": best_score / 100,
                })
            else:
                # Unknown skill — flag as emerging
                unknown.append(raw)
                normalized.append({
                    "canonical_name": raw,  # Keep as-is
                    "original_name": raw,
                    "match_type": "unknown",
                })

    logger.info(
        "Normalized %d skills: %d mapped, %d unknown",
        len(raw_skills), len(raw_skills) - len(unknown), len(unknown),
    )
    return {"normalized_skills": normalized, "emerging_skills": unknown}


def infer_hierarchy_node(state: NormalizationState) -> dict:
    """Infer parent/implied skills from hierarchy rules."""
    normalized = state.get("normalized_skills", [])
    existing_names = {s["canonical_name"] for s in normalized}
    inferred = []

    for skill_entry in normalized:
        canon = skill_entry["canonical_name"]
        implied_list = _BUILTIN_HIERARCHY.get(canon, [])
        for implied in implied_list:
            if implied not in existing_names:
                existing_names.add(implied)
                inferred.append({
                    "canonical_name": implied,
                    "inferred_from": canon,
                    "confidence": 0.8,
                })

    logger.info("Inferred %d additional skills from hierarchy rules", len(inferred))
    return {"inferred_skills": inferred}


def estimate_proficiency_node(state: NormalizationState) -> dict:
    """Estimate proficiency levels based on context clues."""
    normalized = state.get("normalized_skills", [])
    experience_entries = state.get("experience_entries", [])
    total_years = state.get("years_experience") or 0

    # Build a rough skill-to-years map from experience descriptions
    skill_context: dict[str, float] = {}
    for exp in experience_entries:
        desc = (exp.get("description") or "").lower()
        duration_str = exp.get("duration") or ""
        # Rough duration parse
        years = _parse_duration_years(duration_str)
        for skill_entry in normalized:
            canon_lower = skill_entry["canonical_name"].lower()
            orig_lower = skill_entry["original_name"].lower()
            if canon_lower in desc or orig_lower in desc:
                skill_context[skill_entry["canonical_name"]] = (
                    skill_context.get(skill_entry["canonical_name"], 0) + years
                )

    # Assign proficiency levels
    for skill_entry in normalized:
        canon = skill_entry["canonical_name"]
        if canon in skill_context and skill_context[canon] > 0:
            years = skill_context[canon]
            if years >= 5:
                skill_entry["proficiency"] = "expert"
                skill_entry["estimated_years"] = round(years, 1)
            elif years >= 3:
                skill_entry["proficiency"] = "advanced"
                skill_entry["estimated_years"] = round(years, 1)
            elif years >= 1:
                skill_entry["proficiency"] = "intermediate"
                skill_entry["estimated_years"] = round(years, 1)
            else:
                skill_entry["proficiency"] = "beginner"
                skill_entry["estimated_years"] = round(years, 1)
        else:
            # Default based on overall experience
            if total_years and total_years >= 5:
                skill_entry["proficiency"] = "intermediate"
            elif total_years and total_years >= 2:
                skill_entry["proficiency"] = "beginner"
            else:
                skill_entry["proficiency"] = "beginner"
            skill_entry["estimated_years"] = None

    return {"normalized_skills": normalized}


def build_skill_profile_node(state: NormalizationState) -> dict:
    """Assemble final structured skill profile."""
    normalized = state.get("normalized_skills", [])
    inferred = state.get("inferred_skills", [])
    emerging = state.get("emerging_skills", [])

    # Group by category
    categorized: dict[str, list[dict]] = {
        "technical": [], "soft": [], "domain": [], "certification": [],
    }

    for s in normalized:
        cat = _guess_category(s["canonical_name"])
        categorized.setdefault(cat, []).append(s)

    profile = {
        "skills": normalized,
        "inferred_skills": inferred,
        "emerging_skills": emerging,
        "categorized": categorized,
        "total_canonical": len(set(s["canonical_name"] for s in normalized)),
        "total_inferred": len(inferred),
        "total_emerging": len(emerging),
    }
    return {"skill_profile": profile}


async def persist_emerging_skills_node(state: NormalizationState) -> dict:
    """Save unknown skills to the emerging_skills queue for human review."""
    emerging = state.get("emerging_skills", [])
    if not emerging:
        return {}

    async with AsyncSessionLocal() as session:
        for raw_name in emerging:
            # Check if already exists
            result = await session.execute(
                select(EmergingSkill).where(
                    func.lower(EmergingSkill.raw_name) == raw_name.lower()
                )
            )
            existing = result.scalar_one_or_none()
            if existing:
                existing.occurrences += 1
            else:
                session.add(EmergingSkill(
                    raw_name=raw_name,
                    occurrences=1,
                    status="pending",
                ))
        await session.commit()

    logger.info("Persisted %d emerging skills for review", len(emerging))
    return {}


# ── Graph assembly ────────────────────────────────────────────────────

def build_normalization_graph() -> StateGraph:
    graph = StateGraph(NormalizationState)

    graph.add_node("normalize_skills", normalize_skills_node)
    graph.add_node("infer_hierarchy", infer_hierarchy_node)
    graph.add_node("estimate_proficiency", estimate_proficiency_node)
    graph.add_node("build_skill_profile", build_skill_profile_node)
    graph.add_node("persist_emerging", persist_emerging_skills_node)

    graph.set_entry_point("normalize_skills")
    graph.add_edge("normalize_skills", "infer_hierarchy")
    graph.add_edge("infer_hierarchy", "estimate_proficiency")
    graph.add_edge("estimate_proficiency", "build_skill_profile")
    graph.add_edge("build_skill_profile", "persist_emerging")
    graph.add_edge("persist_emerging", END)

    return graph.compile()


# ── Helpers ───────────────────────────────────────────────────────────

def _parse_duration_years(duration_str: str) -> float:
    """Parse rough duration like '2018-2021' or '3 years' or 'Jan 2020 - Present'."""
    import re
    if not duration_str:
        return 1.0

    # Try "X years" pattern
    match = re.search(r"(\d+)\s*(?:yr|year)", duration_str.lower())
    if match:
        return float(match.group(1))

    # Try "YYYY-YYYY" pattern
    years = re.findall(r"(20\d{2}|19\d{2})", duration_str)
    if len(years) >= 2:
        return max(0.5, float(int(years[-1]) - int(years[0])))

    # Try "Present" as current year
    if "present" in duration_str.lower() or "current" in duration_str.lower():
        years_found = re.findall(r"(20\d{2}|19\d{2})", duration_str)
        if years_found:
            from datetime import datetime
            return max(0.5, datetime.now().year - int(years_found[0]))

    return 1.0  # Default if unparseable


_SOFT_SKILLS = {
    "leadership", "communication", "teamwork", "problem solving",
    "project management", "team management", "mentoring", "coaching",
    "strategic thinking", "negotiation", "presentation", "collaboration",
    "time management", "adaptability", "critical thinking", "creativity",
    "analytical thinking", "decision making", "conflict resolution",
    "stakeholder management", "cross-functional collaboration",
}

_CERTIFICATION_KEYWORDS = {
    "certified", "certification", "certificate", "cka", "ckad",
    "aws solutions architect", "pmp", "csm", "professional",
    "associate", "comptia",
}


def _guess_category(skill_name: str) -> str:
    """Guess whether a skill is technical, soft, domain, or certification."""
    lower = skill_name.lower()
    if lower in _SOFT_SKILLS or any(s in lower for s in ["management", "leadership"]):
        return "soft"
    if any(k in lower for k in _CERTIFICATION_KEYWORDS):
        return "certification"
    return "technical"


# Singleton compiled graph
normalization_graph = build_normalization_graph()
