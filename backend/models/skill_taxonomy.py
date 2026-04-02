"""Skill Taxonomy models — hierarchical skill database with synonym mapping.

Tables:
  - skill_categories: Top-level groupings (Technical Skills, Soft Skills, etc.)
  - skills: Individual skills with canonical names, linked to a category
  - skill_synonyms: Many synonyms → one canonical skill (JS → JavaScript)
  - skill_hierarchy_rules: Inference rules (TensorFlow → implies Deep Learning)
  - emerging_skills: Queue for skills not yet in taxonomy, flagged for review
  - api_keys: API key authentication for third-party consumption
  - webhook_subscriptions: Webhook callbacks for async processing
  - agent_traces: Per-agent execution traces for observability
"""

import uuid
from datetime import datetime

from sqlalchemy import String, Float, Text, Integer, ForeignKey, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.database import Base
from backend.models.base import UUIDPrimaryKey, TimestampMixin


class SkillCategory(Base, UUIDPrimaryKey, TimestampMixin):
    """Top-level skill category (e.g., 'Technical Skills', 'Soft Skills')."""
    __tablename__ = "skill_categories"

    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("skill_categories.id"), nullable=True
    )
    # Sub-categories support hierarchical nesting


class Skill(Base, UUIDPrimaryKey, TimestampMixin):
    """Canonical skill entry in the taxonomy."""
    __tablename__ = "skills"

    canonical_name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("skill_categories.id"), nullable=True
    )
    subcategory: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    skill_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="technical"
    )  # technical | soft | domain | certification


class SkillSynonym(Base, UUIDPrimaryKey, TimestampMixin):
    """Maps alternate names/abbreviations to a canonical skill."""
    __tablename__ = "skill_synonyms"

    synonym: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    canonical_skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("skills.id"), nullable=False
    )


class SkillHierarchyRule(Base, UUIDPrimaryKey, TimestampMixin):
    """Inference rules: having skill A implies proficiency in skill B.

    e.g., TensorFlow → Deep Learning, React → Frontend Development
    """
    __tablename__ = "skill_hierarchy_rules"

    source_skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("skills.id"), nullable=False
    )
    implied_skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("skills.id"), nullable=False
    )
    confidence: Mapped[float] = mapped_column(Float, default=0.8)


class EmergingSkill(Base, UUIDPrimaryKey, TimestampMixin):
    """Skills extracted from resumes that are not yet in the taxonomy."""
    __tablename__ = "emerging_skills"

    raw_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    occurrences: Mapped[int] = mapped_column(Integer, default=1)
    suggested_category: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), default="pending"
    )  # pending | approved | rejected
    approved_skill_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("skills.id"), nullable=True
    )


class ApiKey(Base, UUIDPrimaryKey, TimestampMixin):
    """API key for third-party authentication (separate from JWT)."""
    __tablename__ = "api_keys"

    key_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    rate_limit: Mapped[int] = mapped_column(Integer, default=100)  # requests per minute
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class WebhookSubscription(Base, UUIDPrimaryKey, TimestampMixin):
    """Webhook callback URL registered for async processing events."""
    __tablename__ = "webhook_subscriptions"

    url: Mapped[str] = mapped_column(Text, nullable=False)
    events: Mapped[dict] = mapped_column(JSONB, nullable=False, default=list)
    # e.g. ["parse.completed", "match.completed", "batch.completed"]
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    secret: Mapped[str | None] = mapped_column(String(255), nullable=True)


class AgentTrace(Base, UUIDPrimaryKey, TimestampMixin):
    """Per-agent execution trace for observability."""
    __tablename__ = "agent_traces"

    run_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    agent_name: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False)  # running | success | failed | skipped
    input_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    output_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    quality_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    candidate_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
