from datetime import date
from pydantic import BaseModel, Field, ConfigDict


class RecipientInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(max_length=200)
    email: str = Field(max_length=254)


class JobCreate(BaseModel):
    company_name: str = Field(min_length=1, max_length=200)
    event_name: str = Field(min_length=1, max_length=200)
    completion_date: date
    recipients: list[RecipientInput] = Field(min_length=1, max_length=1000)


class JobCreateResponse(BaseModel):
    job_id: str
    status: str
    total: int
    successful: int
    failed: int
    message: str