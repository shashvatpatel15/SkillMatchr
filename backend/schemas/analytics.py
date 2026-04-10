from __future__ import annotations

from pydantic import BaseModel


class SourceBreakdown(BaseModel):
    source: str
    count: int


class IngestionTrend(BaseModel):
    date: str
    count: int


class StatusBreakdown(BaseModel):
    status: str
    count: int


class ExperienceBreakdown(BaseModel):
    category: str
    count: int


class AnalyticsOverview(BaseModel):
    total_candidates: int
    total_shortlists: int
    sources: list[SourceBreakdown]
    ingestion_trends: list[IngestionTrend]
    status_breakdown: list[StatusBreakdown] = []
    experience_breakdown: list[ExperienceBreakdown] = []
