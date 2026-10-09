from datetime import date, datetime, timezone
from sqlalchemy import String, Text, Boolean, Integer, ForeignKey, Date, DateTime, UniqueConstraint, Index, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.session import Base


class Technology(Base):
    __tablename__ = "technologies"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    category: Mapped[str] = mapped_column(String(40))
    listed: Mapped[bool] = mapped_column(Boolean, default=True)
    order: Mapped[int] = mapped_column(Integer, default=0)
    usages: Mapped[list["TechnologyUsage"]] = relationship(cascade="all, delete-orphan", order_by="TechnologyUsage.id")


class TechnologyUsage(Base):
    __tablename__ = "technology_usages"
    id: Mapped[int] = mapped_column(primary_key=True)
    technology_id: Mapped[int] = mapped_column(ForeignKey("technologies.id", ondelete="CASCADE"), index=True)
    description: Mapped[str] = mapped_column(String(300))


class Project(Base):
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    title: Mapped[str] = mapped_column(String(200))
    short_title: Mapped[str] = mapped_column(String(100))
    date: Mapped[str] = mapped_column(String(40))
    category: Mapped[str] = mapped_column(String(100))
    summary: Mapped[str] = mapped_column(Text)
    problem: Mapped[str] = mapped_column(Text)
    solution: Mapped[str] = mapped_column(Text)
    outcome: Mapped[str] = mapped_column(Text)
    github_url: Mapped[str] = mapped_column(String(500))
    live_url: Mapped[str | None] = mapped_column(String(500))
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)
    technology_links: Mapped[list["ProjectTechnology"]] = relationship(cascade="all, delete-orphan", order_by="ProjectTechnology.order")
    features: Mapped[list["ProjectFeature"]] = relationship(cascade="all, delete-orphan", order_by="ProjectFeature.order")
    nodes: Mapped[list["ArchitectureNode"]] = relationship(cascade="all, delete-orphan", order_by="ArchitectureNode.position")
    edges: Mapped[list["ArchitectureEdge"]] = relationship(cascade="all, delete-orphan", order_by="ArchitectureEdge.id")


class ProjectTechnology(Base):
    __tablename__ = "project_technologies"
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)
    technology_id: Mapped[int] = mapped_column(ForeignKey("technologies.id"), primary_key=True)
    order: Mapped[int] = mapped_column(Integer, default=0)
    technology: Mapped[Technology] = relationship()


class ProjectFeature(Base):
    __tablename__ = "project_features"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    description: Mapped[str] = mapped_column(String(500))
    order: Mapped[int] = mapped_column(Integer)


class ArchitectureNode(Base):
    __tablename__ = "project_architecture_nodes"
    __table_args__ = (UniqueConstraint("project_id", "key"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    key: Mapped[str] = mapped_column(String(80))
    label: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text)
    position: Mapped[int] = mapped_column(Integer)


class ArchitectureEdge(Base):
    __tablename__ = "project_architecture_edges"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    source_node_id: Mapped[int] = mapped_column(ForeignKey("project_architecture_nodes.id", ondelete="CASCADE"))
    target_node_id: Mapped[int] = mapped_column(ForeignKey("project_architecture_nodes.id", ondelete="CASCADE"))
    label: Mapped[str] = mapped_column(String(150))
    source_node: Mapped[ArchitectureNode] = relationship(foreign_keys=[source_node_id])
    target_node: Mapped[ArchitectureNode] = relationship(foreign_keys=[target_node_id])


class Experience(Base):
    __tablename__ = "experiences"
    id: Mapped[int] = mapped_column(primary_key=True)
    company: Mapped[str] = mapped_column(String(150))
    position: Mapped[str] = mapped_column(String(200))
    start_date: Mapped[str] = mapped_column(String(7))
    end_date: Mapped[str | None] = mapped_column(String(7))
    location: Mapped[str] = mapped_column(String(100))
    highlights: Mapped[list["ExperienceHighlight"]] = relationship(cascade="all, delete-orphan", order_by="ExperienceHighlight.order")
    technology_links: Mapped[list["ExperienceTechnology"]] = relationship(cascade="all, delete-orphan", order_by="ExperienceTechnology.order")


class ExperienceHighlight(Base):
    __tablename__ = "experience_highlights"
    id: Mapped[int] = mapped_column(primary_key=True)
    experience_id: Mapped[int] = mapped_column(ForeignKey("experiences.id", ondelete="CASCADE"), index=True)
    description: Mapped[str] = mapped_column(Text)
    order: Mapped[int] = mapped_column(Integer)


class ExperienceTechnology(Base):
    __tablename__ = "experience_technologies"
    experience_id: Mapped[int] = mapped_column(ForeignKey("experiences.id", ondelete="CASCADE"), primary_key=True)
    technology_id: Mapped[int] = mapped_column(ForeignKey("technologies.id"), primary_key=True)
    order: Mapped[int] = mapped_column(Integer, default=0)
    technology: Mapped[Technology] = relationship()


class Contribution(Base):
    __tablename__ = "contributions"
    id: Mapped[int] = mapped_column(primary_key=True)
    organization: Mapped[str] = mapped_column(String(100))
    repository: Mapped[str] = mapped_column(String(200))
    pr_number: Mapped[int] = mapped_column(Integer)
    url: Mapped[str] = mapped_column(String(500), unique=True)
    status: Mapped[str] = mapped_column(String(40))
    description: Mapped[str] = mapped_column(Text)


class Certification(Base):
    __tablename__ = "certifications"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200), unique=True)
    issuer: Mapped[str] = mapped_column(String(150))
    year: Mapped[int] = mapped_column(Integer)
    kind: Mapped[str] = mapped_column(String(60))


class ContactMessage(Base):
    __tablename__ = "contact_messages"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(254))
    subject: Mapped[str] = mapped_column(String(160))
    message: Mapped[str] = mapped_column(Text)
    ip_hash: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    status: Mapped[str] = mapped_column(String(16), default="NEW", server_default="NEW")
    email_delivery_status: Mapped[str] = mapped_column(String(16), default="PENDING", server_default="PENDING")
    __table_args__ = (Index("ix_contact_ip_created", "ip_hash", "created_at"),
        CheckConstraint("status IN ('NEW','READ','REPLIED','SPAM')", name="ck_contact_status"),
        CheckConstraint("email_delivery_status IN ('PENDING','SENT','FAILED','DISABLED')", name="ck_contact_delivery"))


class RateLimitBucket(Base):
    __tablename__ = "rate_limit_buckets"
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    tokens: Mapped[int] = mapped_column(Integer)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class CandidateProfile(Base):
    __tablename__ = "candidate_profile"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    location: Mapped[str] = mapped_column(String(150))
    email: Mapped[str] = mapped_column(String(254))
    github_url: Mapped[str] = mapped_column(String(500))
    linkedin_url: Mapped[str] = mapped_column(String(500))
    summary: Mapped[str] = mapped_column(Text)
    resume_sha256: Mapped[str] = mapped_column(String(64))
    roles: Mapped[list["ProfileRole"]] = relationship(cascade="all, delete-orphan", order_by="ProfileRole.order")


class ProfileRole(Base):
    __tablename__ = "profile_roles"
    id: Mapped[int] = mapped_column(primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("candidate_profile.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(100))
    order: Mapped[int] = mapped_column(Integer)


class Education(Base):
    __tablename__ = "education"
    id: Mapped[int] = mapped_column(primary_key=True)
    qualification: Mapped[str] = mapped_column(String(200))
    institution: Mapped[str] = mapped_column(String(200))
    expected_year: Mapped[int] = mapped_column(Integer)
    grade: Mapped[str] = mapped_column(String(80))


class ContentRevision(Base):
    __tablename__ = "content_revisions"
    key: Mapped[str] = mapped_column(String(40), primary_key=True)
    digest: Mapped[str] = mapped_column(String(64))
