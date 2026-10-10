from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session
import re

from app.database import get_db
from app.models import GenerationJob, CertificateRecord
from app.schemas import JobCreate, JobCreateResponse
from app.services.generator import process_generation_job

router = APIRouter(prefix="/api/v1/jobs", tags=["Certificate Jobs"])

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@router.post("", response_model=JobCreateResponse, status_code=202)
def create_job(
    request: JobCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    event_name = request.event_name.strip()
    company_name = request.company_name.strip()

    if not event_name:
        raise HTTPException(status_code=422, detail="Event name cannot be empty")

    if not company_name:
        raise HTTPException(status_code=422, detail="Company name cannot be empty")

    job = GenerationJob(
        company_name=company_name,
        event_name=event_name,
        completion_date=request.completion_date.isoformat(),
        status="queued",
        total_recipients=len(request.recipients),
        successful_count=0,
        failed_count=0,
    )

    db.add(job)
    db.flush()  # get the job.id before we start creating records

    failed_count = 0

    try:
        for recipient in request.recipients:
            name = recipient.name.strip()
            email = recipient.email.strip()

            errors = []
            if not name:
                errors.append("Name is required")
            if not EMAIL_PATTERN.fullmatch(email):
                errors.append("A valid email is required")

            record = CertificateRecord(
                job_id=job.id,
                recipient_name=name,
                recipient_email=email,
                status="failed" if errors else "pending",
                error_message="; ".join(errors) if errors else None,
            )

            if errors:
                failed_count += 1

            db.add(record)

        job.failed_count = failed_count
        db.commit()
        db.refresh(job)

    except Exception:
        db.rollback()
        raise

    # Kick off PDF generation after we respond
    background_tasks.add_task(process_generation_job, job.id)

    return JobCreateResponse(
        job_id=job.id,
        status=job.status,
        total=job.total_recipients,
        successful=job.successful_count,
        failed=job.failed_count,
        message="Generation job created successfully",
    )


@router.get("")
def list_jobs(db: Session = Depends(get_db)):
    jobs = (
        db.query(GenerationJob)
        .order_by(GenerationJob.created_at.desc())
        .all()
    )

    return [
        {
            "job_id": job.id,
            "event_name": job.event_name,
            "status": job.status,
            "total": job.total_recipients,
            "successful": job.successful_count,
            "failed": job.failed_count,
            "created_at": job.created_at.isoformat() if job.created_at else None,
        }
        for job in jobs
    ]


@router.get("/{job_id}")
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    records = (
        db.query(CertificateRecord)
        .filter(CertificateRecord.job_id == job_id)
        .all()
    )

    processed = sum(1 for r in records if r.status in ("success", "failed"))

    return {
        "job_id": job.id,
        "event_name": job.event_name,
        "company_name": job.company_name,
        "completion_date": job.completion_date,
        "status": job.status,
        "total": job.total_recipients,
        "processed": processed,
        "successful": job.successful_count,
        "failed": job.failed_count,
        "results": [
            {
                "recipient_id": r.id,
                "name": r.recipient_name,
                "email": r.recipient_email,
                "status": r.status,
                "error": r.error_message,
            }
            for r in records
        ],
    }