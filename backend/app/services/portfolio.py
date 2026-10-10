from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.models import Project, ProjectTechnology, ArchitectureEdge, Technology, Experience, ExperienceTechnology
from app.schemas import ProjectOut, ArchitectureNodeOut, ArchitectureEdgeOut, ExperienceOut, TechnologyOut


def project_query():
    return select(Project).options(
        selectinload(Project.technology_links).selectinload(ProjectTechnology.technology),
        selectinload(Project.features), selectinload(Project.nodes),
        selectinload(Project.edges).selectinload(ArchitectureEdge.source_node),
        selectinload(Project.edges).selectinload(ArchitectureEdge.target_node))


def serialize_project(p: Project) -> ProjectOut:
    fields = {name: getattr(p, name) for name in (
        "slug", "title", "short_title", "date", "category", "summary", "problem", "solution",
        "outcome", "github_url", "live_url", "featured")}
    return ProjectOut(**fields, technologies=[link.technology.name for link in p.technology_links],
                      features=[f.description for f in p.features],
                      nodes=[ArchitectureNodeOut.model_validate(n) for n in p.nodes],
                      edges=[ArchitectureEdgeOut(source=e.source_node.key, target=e.target_node.key, label=e.label) for e in p.edges])


def get_skills(db: Session):
    technologies = db.scalars(select(Technology).where(Technology.listed.is_(True)).order_by(Technology.order).options(selectinload(Technology.usages)))
    return [TechnologyOut(name=t.name, category=t.category, usages=[u.description for u in t.usages]) for t in technologies]


def get_experience(db: Session):
    roles = db.scalars(select(Experience).order_by(Experience.start_date.desc()).options(
        selectinload(Experience.highlights), selectinload(Experience.technology_links).selectinload(ExperienceTechnology.technology)))
    return [ExperienceOut(company=e.company, position=e.position, start_date=e.start_date,
                          end_date=e.end_date, location=e.location,
                          highlights=[h.description for h in e.highlights],
                          technologies=[link.technology.name for link in e.technology_links]) for e in roles]
