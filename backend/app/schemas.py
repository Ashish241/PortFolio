from datetime import date
from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ArchitectureNodeOut(ORMModel):
    key: str
    label: str
    description: str
    position: int


class ArchitectureEdgeOut(BaseModel):
    source: str
    target: str
    label: str


class ProjectOut(BaseModel):
    slug: str
    title: str
    short_title: str
    date: str
    category: str
    summary: str
    problem: str
    solution: str
    outcome: str
    github_url: str
    live_url: str | None
    featured: bool
    technologies: list[str]
    features: list[str]
    nodes: list[ArchitectureNodeOut]
    edges: list[ArchitectureEdgeOut]


class TechnologyOut(BaseModel):
    name: str
    category: str
    usages: list[str]


class ExperienceOut(BaseModel):
    company: str
    position: str
    start_date: str = Field(pattern=r"^\d{4}-\d{2}$")
    end_date: str | None = Field(pattern=r"^\d{4}-\d{2}$")
    location: str
    highlights: list[str]
    technologies: list[str]


class ContributionOut(ORMModel):
    organization: str
    repository: str
    pr_number: int
    url: str
    status: str
    description: str


class CertificationOut(ORMModel):
    title: str
    issuer: str
    year: int
    kind: str


class ContactCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr = Field(max_length=254)
    subject: str = Field(min_length=3, max_length=160)
    message: str = Field(min_length=20, max_length=5000)
    website: str = Field(default="", max_length=200)
    started_at: int = Field(gt=0)

    @field_validator("name", "subject", "message")
    @classmethod
    def no_control_characters(cls, value: str) -> str:
        if any(ord(c) < 32 and c not in "\n\r\t" for c in value):
            raise ValueError("Control characters are not allowed")
        return value


class AssistantRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    message: str = Field(min_length=2, max_length=1000)
    conversation_id: str | None = Field(default=None, pattern=r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")


class AssistantAction(BaseModel):
    type: Literal["NAVIGATE_SECTION", "OPEN_PROJECT", "OPEN_GITHUB", "DOWNLOAD_RESUME"]
    target: str
    label: str


class AssistantSource(BaseModel):
    id: str
    label: str


class AssistantResponse(BaseModel):
    conversation_id: str
    answer: str
    suggested_actions: list[AssistantAction]
    sources: list[AssistantSource]
    mode: Literal["grounded", "groq", "openai", "grounded-fallback"]
    warning: str | None = None
