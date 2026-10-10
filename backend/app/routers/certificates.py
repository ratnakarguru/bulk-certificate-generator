from io import BytesIO
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import GenerationJob, CertificateRecord

router = APIRouter(prefix="/api/v1/jobs", tags=["Certificate Downloads"])


def get_job_or_404(job_id: str, db: Session) -> GenerationJob:
    job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/{job_id}/certificates")
def list_certificates(job_id: str, db: Session = Depends(get_db)):
    get_job_or_404(job_id, db)

    records = (
        db.query(CertificateRecord)
        .filter(
            CertificateRecord.job_id == job_id,
            CertificateRecord.status == "success",
        )
        .all()
    )

    return [
        {
            "recipient_id": r.id,
            "name": r.recipient_name,
            "download_url": f"/api/v1/jobs/{job_id}/certificates/{r.id}",
        }
        for r in records
    ]


@router.get("/{job_id}/certificates/{recipient_id}")
def download_certificate(
    job_id: str,
    recipient_id: str,
    db: Session = Depends(get_db),
):
    record = (
        db.query(CertificateRecord)
        .filter(
            CertificateRecord.id == recipient_id,
            CertificateRecord.job_id == job_id,
        )
        .first()
    )

    if not record:
        raise HTTPException(status_code=404, detail="Certificate record not found")

    if record.status != "success" or not record.file_path:
        raise HTTPException(status_code=409, detail="Certificate is not available yet")

    # Make sure the file is actually inside our generated folder
    file_path = Path(record.file_path).resolve()
    generated_dir = (Path(__file__).resolve().parents[2] / "generated").resolve()

    if generated_dir not in file_path.parents or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Certificate file not found")

    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=f"certificate-{record.id}.pdf",
    )


@router.get("/{job_id}/download")
def download_all_certificates(job_id: str, db: Session = Depends(get_db)):
    get_job_or_404(job_id, db)

    records = (
        db.query(CertificateRecord)
        .filter(
            CertificateRecord.job_id == job_id,
            CertificateRecord.status == "success",
        )
        .all()
    )

    zip_buffer = BytesIO()
    files_added = 0

    with ZipFile(zip_buffer, "w", compression=ZIP_DEFLATED) as zf:
        for record in records:
            if not record.file_path:
                continue

            file_path = Path(record.file_path).resolve()
            generated_dir = (Path(__file__).resolve().parents[2] / "generated").resolve()

            # Skip anything that isn't safely inside the generated directory
            if generated_dir not in file_path.parents or not file_path.is_file():
                continue

            zf.write(file_path, arcname=f"certificate-{record.id}.pdf")
            files_added += 1

    if files_added == 0:
        raise HTTPException(status_code=409, detail="No generated certificates are available")

    zip_buffer.seek(0)

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="certificates-{job_id}.zip"'
        },
    )