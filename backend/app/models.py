import uuid
from datetime import datetime

from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from app.database import Base


def generate_id() -> str:
    return str(uuid.uuid4())


class GenerationJob(Base):
    __tablename__ = "generation_jobs"

    id = Column(String(36), primary_key=True, default=generate_id)
    event_name = Column(String(200), nullable=False)
    company_name = Column(String(200), nullable=False, default="My Company")
    completion_date = Column(String(20), nullable=False)

    status = Column(String(30), nullable=False, default="queued")
    total_recipients = Column(Integer, nullable=False, default=0)
    successful_count = Column(Integer, nullable=False, default=0)
    failed_count = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)


class CertificateRecord(Base):
    __tablename__ = "certificate_records"

    id = Column(String(36), primary_key=True, default=generate_id)
    job_id = Column(
        String(36),
        ForeignKey("generation_jobs.id"),
        nullable=False,
        index=True,
    )

    recipient_name = Column(String(200), nullable=False)
    recipient_email = Column(String(254), nullable=False)

    status = Column(String(20), nullable=False, default="pending")
    file_path = Column(String(500), nullable=True)
    error_message = Column(Text, nullable=True)