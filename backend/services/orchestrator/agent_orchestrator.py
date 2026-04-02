"""Multi-Agent Orchestration Layer.

Manages the lifecycle of parsing, normalization, and matching agents
with shared message protocol, retry logic, graceful degradation,
and per-agent execution traces / latency metrics / quality scores.
"""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from backend.core.database import AsyncSessionLocal
from backend.models.skill_taxonomy import AgentTrace

logger = logging.getLogger(__name__)


class AgentStatus(str, Enum):
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"
    RETRYING = "retrying"
    DEGRADED = "degraded"  # partial result returned


@dataclass
class AgentMessage:
    """Shared message protocol between agents."""
    agent_name: str
    status: AgentStatus
    payload: dict = field(default_factory=dict)
    error: str | None = None
    latency_ms: int = 0
    quality_score: float | None = None
    retry_count: int = 0


@dataclass
class PipelineRun:
    """Tracks a single end-to-end pipeline execution."""
    run_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    started_at: float = field(default_factory=time.time)
    traces: list[AgentMessage] = field(default_factory=list)
    status: str = "running"
    candidate_id: str | None = None
    total_latency_ms: int = 0

    def elapsed_ms(self) -> int:
        return int((time.time() - self.started_at) * 1000)


class AgentOrchestrator:
    """Orchestrates multi-agent pipelines with retry, tracing, and degradation."""

    def __init__(self, max_retries: int = 2, timeout_seconds: float = 30.0):
        self.max_retries = max_retries
        self.timeout_seconds = timeout_seconds
        self._active_runs: dict[str, PipelineRun] = {}

    async def execute_agent(
        self,
        run: PipelineRun,
        agent_name: str,
        agent_fn,
        state: dict,
        *,
        critical: bool = True,
        quality_fn=None,
    ) -> dict:
        """Execute a single agent with retry logic and tracing.

        Args:
            run: The pipeline run context
            agent_name: Name of the agent for tracing
            agent_fn: Async or sync callable that processes state
            state: Current pipeline state
            critical: If True, failure stops the pipeline. If False, graceful degradation.
            quality_fn: Optional callable to compute quality score from result
        """
        last_error = None

        for attempt in range(self.max_retries + 1):
            start = time.time()
            try:
                if attempt > 0:
                    logger.info(
                        "Retrying agent '%s' (attempt %d/%d) [run=%s]",
                        agent_name, attempt + 1, self.max_retries + 1, run.run_id[:8],
                    )

                # Execute with timeout
                if asyncio.iscoroutinefunction(agent_fn):
                    result = await asyncio.wait_for(
                        agent_fn(state),
                        timeout=self.timeout_seconds,
                    )
                else:
                    result = await asyncio.get_event_loop().run_in_executor(
                        None, agent_fn, state
                    )

                latency = int((time.time() - start) * 1000)
                quality = quality_fn(result) if quality_fn else None

                msg = AgentMessage(
                    agent_name=agent_name,
                    status=AgentStatus.SUCCESS,
                    payload=_summarize_payload(result),
                    latency_ms=latency,
                    quality_score=quality,
                    retry_count=attempt,
                )
                run.traces.append(msg)

                # Persist trace
                await self._persist_trace(run, msg)

                return result

            except asyncio.TimeoutError:
                latency = int((time.time() - start) * 1000)
                last_error = f"Agent '{agent_name}' timed out after {self.timeout_seconds}s"
                logger.warning(last_error)

            except Exception as e:
                latency = int((time.time() - start) * 1000)
                last_error = f"Agent '{agent_name}' failed: {str(e)}"
                logger.warning(last_error, exc_info=True)

        # All retries exhausted
        msg = AgentMessage(
            agent_name=agent_name,
            status=AgentStatus.FAILED,
            error=last_error,
            latency_ms=int((time.time() - start) * 1000),
            retry_count=self.max_retries,
        )
        run.traces.append(msg)
        await self._persist_trace(run, msg)

        if critical:
            raise RuntimeError(last_error)
        else:
            # Graceful degradation — return empty result
            logger.warning(
                "Agent '%s' failed but is non-critical, degrading gracefully [run=%s]",
                agent_name, run.run_id[:8],
            )
            msg.status = AgentStatus.DEGRADED
            return {}

    async def run_pipeline(
        self,
        agents: list[dict],
        initial_state: dict,
    ) -> tuple[dict, PipelineRun]:
        """Run a sequence of agents as a pipeline.

        Each agent dict has:
          - name: str
          - fn: callable
          - critical: bool (default True)
          - quality_fn: optional callable

        Returns (final_state, pipeline_run).
        """
        run = PipelineRun()
        self._active_runs[run.run_id] = run
        state = dict(initial_state)

        try:
            for agent_config in agents:
                result = await self.execute_agent(
                    run=run,
                    agent_name=agent_config["name"],
                    agent_fn=agent_config["fn"],
                    state=state,
                    critical=agent_config.get("critical", True),
                    quality_fn=agent_config.get("quality_fn"),
                )
                state.update(result or {})

            run.status = "completed"
        except Exception as e:
            run.status = "failed"
            logger.error("Pipeline failed [run=%s]: %s", run.run_id[:8], e)
        finally:
            run.total_latency_ms = run.elapsed_ms()
            # Clean up after a delay
            asyncio.get_event_loop().call_later(
                300, lambda: self._active_runs.pop(run.run_id, None)
            )

        return state, run

    def get_run(self, run_id: str) -> PipelineRun | None:
        return self._active_runs.get(run_id)

    def get_active_runs(self) -> list[dict]:
        return [
            {
                "run_id": r.run_id,
                "status": r.status,
                "elapsed_ms": r.elapsed_ms(),
                "agent_count": len(r.traces),
                "candidate_id": r.candidate_id,
            }
            for r in self._active_runs.values()
        ]

    async def _persist_trace(self, run: PipelineRun, msg: AgentMessage):
        """Save agent trace to database for observability."""
        try:
            async with AsyncSessionLocal() as session:
                trace = AgentTrace(
                    run_id=run.run_id,
                    agent_name=msg.agent_name,
                    status=msg.status.value,
                    input_summary=str(msg.payload)[:500] if msg.payload else None,
                    output_summary=None,
                    error_message=msg.error,
                    latency_ms=msg.latency_ms,
                    quality_score=msg.quality_score,
                    metadata_json={
                        "retry_count": msg.retry_count,
                    },
                    candidate_id=uuid.UUID(run.candidate_id) if run.candidate_id else None,
                )
                session.add(trace)
                await session.commit()
        except Exception as e:
            logger.warning("Failed to persist agent trace: %s", e)


def _summarize_payload(result: dict) -> dict:
    """Create a concise summary of agent output for tracing."""
    if not result:
        return {}
    summary = {}
    for k, v in result.items():
        if isinstance(v, str) and len(v) > 200:
            summary[k] = v[:200] + "..."
        elif isinstance(v, list):
            summary[k] = f"[{len(v)} items]"
        elif isinstance(v, dict):
            summary[k] = f"{{{len(v)} keys}}"
        elif isinstance(v, bytes):
            summary[k] = f"<{len(v)} bytes>"
        else:
            summary[k] = v
    return summary


# Singleton orchestrator
orchestrator = AgentOrchestrator(max_retries=2, timeout_seconds=30.0)
