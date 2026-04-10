from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from backend.core.auth import get_current_user
from backend.models.user import User
from backend.schemas.ingest import UploadResponse, ParsedResume
from backend.services.linkedin.linkedin_parser import ingest_linkedin_pdf

router = APIRouter(prefix="/api/ingest", tags=["Ingestion Sources"])

ALLOWED_PDF = {"application/pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024


# ── LinkedIn ──────────────────────────────────────────────────────


@router.post("/linkedin", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_linkedin_pdf(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload a LinkedIn profile PDF for parsing and ingestion."""
    if file.content_type not in ALLOWED_PDF:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="LinkedIn ingestion requires a PDF file.",
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

    result = await ingest_linkedin_pdf(
        file_bytes=file_bytes,
        filename=file.filename or "linkedin_profile.pdf",
        user_id=str(current_user.id),
    )

    parsed_data = result.get("parsed_data", {})
    parsed = ParsedResume(**parsed_data) if parsed_data else ParsedResume(
        full_name="Unknown", summary="Parsing failed — flagged for manual review"
    )

    return UploadResponse(
        candidate_id=result["candidate_id"],
        status=result["status"],
        parsed_data=parsed,
    )
