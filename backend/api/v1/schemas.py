"""Pydantic schemas for v1 API endpoints."""

from __future__ import annotations

import uuid
from pydantic import BaseModel, Field
from typing import Any


# ── Error Response ────────────────────────────────────────────────────

class ErrorResponse(BaseModel):
    error: str
    message: str
    details: dict | None = None


# ── Parse Endpoints ───────────────────────────────────────────────────

class ParseResponse(BaseModel):
    candidate_id: str
    status: str
    parsed_data: dict
    skill_profile: dict | None = None
    pipeline_run_id: str | None = None
    latency_ms: int | None = None

    model_config = {"json_schema_extra": {
        "example": {
            "candidate_id": "550e8400-e29b-41d4-a716-446655440000",
            "status": "completed",
            "parsed_data": {
                "full_name": "John Doe",
                "email": "john@example.com",
                "skills": ["Python", "React", "PostgreSQL"],
            },
            "skill_profile": {
                "total_canonical": 3,
                "total_inferred": 2,
            },
            "pipeline_run_id": "run-abc123",
            "latency_ms": 4500,
        }
    }}


class BatchParseRequest(BaseModel):
    webhook_url: str | None = Field(
        default=None,
        description="URL to receive callback when batch processing completes",
    )


class BatchJobStatus(BaseModel):
    job_id: str
    status: str  # queued | processing | completed | failed
    total: int
    processed: int
    succeeded: int
    failed: int
    results: list[dict] | None = None
    created_at: str | None = None
    completed_at: str | None = None


class BatchParseResponse(BaseModel):
    job_id: str
    status: str
    total: int
    message: str


# ── Skill Profile ────────────────────────────────────────────────────

class SkillEntry(BaseModel):
    canonical_name: str
    original_name: str | None = None
    match_type: str | None = None  # exact | synonym | fuzzy | unknown
    proficiency: str | None = None  # expert | advanced | intermediate | beginner
    estimated_years: float | None = None
    category: str | None = None

class InferredSkill(BaseModel):
    canonical_name: str
    inferred_from: str
    confidence: float

class SkillProfileResponse(BaseModel):
    candidate_id: str
    candidate_name: str
    skills: list[SkillEntry]
    inferred_skills: list[InferredSkill]
    emerging_skills: list[str]
    total_canonical: int
    total_inferred: int
    total_emerging: int


# ── Match Endpoints ──────────────────────────────────────────────────

class MatchRequestBody(BaseModel):
    candidate_id: str = Field(..., description="UUID of the candidate to match")
    job_description: str = Field(..., description="Full text of the job description")
    job_title: str = Field(..., description="Job title")
    skills_required: list[str] = Field(default_factory=list)
    skills_nice_to_have: list[str] = Field(default_factory=list)
    experience_required: float | None = None
    match_threshold: float = Field(
        default=0.3, ge=0.0, le=1.0,
        description="Minimum match score threshold (0=broad, 1=strict)",
    )


class SkillGap(BaseModel):
    skill: str
    importance: str  # required | nice_to_have
    upskilling_suggestions: list[str]


class MatchResultDetail(BaseModel):
    candidate_id: str
    candidate_name: str
    overall_score: float
    breakdown: dict
    matched_skills: list[str]
    missing_skills: list[str]
    gap_analysis: list[SkillGap]
    recommendation: str  # strong_match | good_match | partial_match | weak_match


class MatchResponse(BaseModel):
    job_title: str
    candidate: MatchResultDetail


# ── Taxonomy Endpoints ───────────────────────────────────────────────

class TaxonomyCategoryResponse(BaseModel):
    id: str
    name: str
    description: str | None
    parent_id: str | None
    skill_count: int = 0
    children: list[TaxonomyCategoryResponse] = []

    model_config = {"from_attributes": True}


class TaxonomySkillResponse(BaseModel):
    id: str
    canonical_name: str
    category: str | None
    subcategory: str | None
    skill_type: str
    synonyms: list[str] = []


class TaxonomySearchResponse(BaseModel):
    query: str
    total: int
    categories: list[TaxonomyCategoryResponse]
    skills: list[TaxonomySkillResponse]


# ── Webhook ──────────────────────────────────────────────────────────

class WebhookSubscriptionCreate(BaseModel):
    url: str
    events: list[str] = Field(
        default=["parse.completed", "batch.completed", "match.completed"],
        description="Events to subscribe to",
    )
    secret: str | None = Field(
        default=None,
        description="Secret to sign webhook payloads for verification",
    )


class WebhookSubscriptionResponse(BaseModel):
    id: str
    url: str
    events: list[str]
    is_active: bool
    created_at: str


# ── API Key Management ───────────────────────────────────────────────

class ApiKeyCreateRequest(BaseModel):
    name: str = Field(..., description="Friendly name for the API key")
    rate_limit: int = Field(default=100, ge=10, le=1000)


class ApiKeyCreateResponse(BaseModel):
    id: str
    name: str
    api_key: str  # Only shown once at creation time
    rate_limit: int
    message: str = "Store this API key securely. It will not be shown again."


class ApiKeyListItem(BaseModel):
    id: str
    name: str
    rate_limit: int
    is_active: bool
    last_used_at: str | None
    created_at: str


# ── Pipeline Observability ───────────────────────────────────────────

class AgentTraceResponse(BaseModel):
    agent_name: str
    status: str
    latency_ms: int | None
    quality_score: float | None
    error_message: str | None
    retry_count: int | None


class PipelineRunResponse(BaseModel):
    run_id: str
    status: str
    total_latency_ms: int
    candidate_id: str | None
    traces: list[AgentTraceResponse]


# ── Evaluation Metrics ───────────────────────────────────────────────

class EvaluationMetrics(BaseModel):
    parsing_accuracy: dict = Field(
        default_factory=dict,
        description="Field-level F1-scores for resume parsing",
    )
    normalization_precision: dict = Field(
        default_factory=dict,
        description="Correct canonical mapping rates",
    )
    matching_quality: dict = Field(
        default_factory=dict,
        description="NDCG and correlation with expert rankings",
    )
    api_completeness: dict = Field(
        default_factory=dict,
        description="Endpoint coverage and error handling metrics",
    )
    orchestration_reliability: dict = Field(
        default_factory=dict,
        description="Success rate under concurrent load",
    )
    latency: dict = Field(
        default_factory=dict,
        description="End-to-end processing time metrics",
    )
