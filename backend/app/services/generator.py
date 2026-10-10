from app.database import SessionLocal
from app.models import GenerationJob, CertificateRecord
from app.services.certificate import generate_certificate


def process_generation_job(job_id: str) -> None:
    db = SessionLocal()

    try:
        job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
        if not job:
            return

        job.status = "processing"
        db.commit()

        records = (
            db.query(CertificateRecord)
            .filter(CertificateRecord.job_id == job_id)
            .all()
        )

        # Some recipients may already be marked as failed from validation
        successful = 0
        failed = sum(1 for r in records if r.status == "failed")

        for record in records:
            if record.status == "failed":
                continue

            try:
                file_path = generate_certificate(
                    recipient_name=record.recipient_name,
                    event_name=job.event_name,
                    completion_date=job.completion_date,
                    certificate_id=record.id,
                    company_name=job.company_name,
                )

                record.file_path = file_path
                record.status = "success"
                record.error_message = None
                successful += 1

            except Exception as e:
                record.status = "failed"
                record.file_path = None
                record.error_message = f"Certificate generation failed: {str(e)[:500]}"
                failed += 1

            # Commit after each certificate so we don't lose progress
            # if something blows up later
            job.successful_count = successful
            job.failed_count = failed
            db.commit()

        job.status = "completed_with_errors" if failed else "completed"
        db.commit()

    except Exception:
        db.rollback()

        # If something went wrong at the job level, mark it as failed
        job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
        if job:
            job.status = "failed"
            db.commit()

    finally:
        db.close()