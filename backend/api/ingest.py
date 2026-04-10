import asyncio

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from pydantic import BaseModel
from backend.core.auth import get_current_user
from backend.models.user import User
from backend.schemas.ingest import UploadResponse, ParsedResume
from backend.services.workflows.ingestion_graph import ingestion_graph

router = APIRouter(prefix="/api/ingest", tags=["Ingestion"])

ALLOWED_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

BATCH_SEMAPHORE = asyncio.Semaphore(2)

@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {file.content_type}. Upload PDF or DOCX.",
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds 10 MB limit",
        )

    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    initial_state = {
        "file_bytes": file_bytes,
        "filename": file.filename or "unknown.pdf",
        "source": "resume_upload",
        "user_id": str(current_user.id),
    }

    result = await ingestion_graph.ainvoke(initial_state)

    parsed_data = result.get("parsed_data", {})
    
    # Use filename as fallback if parsing completely failed
    fallback_name = (file.filename or "Unknown").replace(".pdf", "").replace(".docx", "").replace(".txt", "").replace("_", " ").title()
    
    if parsed_data:
        if not parsed_data.get("full_name") or parsed_data.get("full_name") == "Unknown":
            parsed_data["full_name"] = fallback_name
        parsed = ParsedResume(**parsed_data)
    else:
        parsed = ParsedResume(
            full_name=fallback_name, summary="Parsing failed — flagged for manual review"
        )

    # Bust analytics cache so dashboard updates immediately
    from backend.core.cache import cache_invalidate
    await cache_invalidate(f"analytics:overview:{current_user.id}")

    return UploadResponse(
        candidate_id=result["candidate_id"],
        status=result["status"],
        parsed_data=parsed,
    )


# ── Batch upload ─────────────────────────────────────────────────


class BatchFileResult(BaseModel):
    filename: str
    status: str  # "success" | "error"
    candidate_id: str | None = None
    error: str | None = None


class BatchUploadResponse(BaseModel):
    total: int
    succeeded: int
    failed: int
    results: list[BatchFileResult]


async def _process_single_file(
    file: UploadFile,
    user_id: str,
) -> BatchFileResult:
    """Process a single file through the ingestion pipeline.

    Returns a BatchFileResult — never raises, catches all errors.
    """
    filename = file.filename or "unknown"

    try:
        if file.content_type not in ALLOWED_TYPES:
            return BatchFileResult(
                filename=filename,
                status="error",
                error=f"Unsupported file type: {file.content_type}",
            )

        file_bytes = await file.read()

        if len(file_bytes) == 0:
            return BatchFileResult(
                filename=filename,
                status="error",
                error="File is empty",
            )

        if len(file_bytes) > MAX_FILE_SIZE:
            return BatchFileResult(
                filename=filename,
                status="error",
                error="File exceeds 10 MB limit",
            )

        async with BATCH_SEMAPHORE:
            result = await ingestion_graph.ainvoke({
                "file_bytes": file_bytes,
                "filename": filename,
                "source": "resume_upload",
                "user_id": user_id,
            })

        return BatchFileResult(
            filename=filename,
            status="success",
            candidate_id=result.get("candidate_id"),
        )

    except Exception as e:
        return BatchFileResult(
            filename=filename,
            status="error",
            error=str(e),
        )


@router.post("/upload/batch", response_model=BatchUploadResponse)
async def upload_batch(
    files: list[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload multiple resume files at once.

    Processes all files concurrently through the ingestion pipeline.
    Returns per-file status — individual failures don't block others.
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files provided",
        )

    if len(files) > 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 50 files per batch",
        )

    user_id = str(current_user.id)

    # Process files sequentially with a small stagger delay
    # to avoid LLM rate limiting (Gemini/Groq)
    results = []
    for i, f in enumerate(files):
        if i > 0:
            await asyncio.sleep(1.5)  # stagger to avoid rate limits
        result = await _process_single_file(f, user_id)
        results.append(result)

    succeeded = sum(1 for r in results if r.status == "success")

    return BatchUploadResponse(
        total=len(results),
        succeeded=succeeded,
        failed=len(results) - succeeded,
        results=list(results),
    )
