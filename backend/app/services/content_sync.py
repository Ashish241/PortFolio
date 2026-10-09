import hashlib
import json
from sqlalchemy import select
from app.models import (Technology, TechnologyUsage, Project, ProjectTechnology, ProjectFeature,
                        ArchitectureNode, ArchitectureEdge, Experience, ExperienceHighlight,
                        ExperienceTechnology, Contribution, Certification, CandidateProfile,
                        ProfileRole, Education, ContentRevision)


def sync_content(db, data):
    """Update the approved revision without touching messages or stable project IDs."""
    digest = hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()
    revision = db.get(ContentRevision, "active")
    if revision and revision.digest == digest:
        return False
    technologies = {t.name: t for t in db.scalars(select(Technology))}
    wanted = {s["name"] for s in data["skills"]} | {t for p in data["projects"] for t in p["technologies"]} | {t for e in data["experience"] for t in e["technologies"]}
    for name in wanted:
        if name not in technologies:
            technologies[name] = Technology(name=name, category="Project-specific", listed=False)
            db.add(technologies[name])
    for t in technologies.values():
        t.listed = False
    for i, s in enumerate(data["skills"]):
        t = technologies[s["name"]]
        t.category, t.order, t.listed = s["category"], i, True
        t.usages = [TechnologyUsage(description=u) for u in s["usages"]]
    db.flush()
    projects = {p.slug: p for p in db.scalars(select(Project))}
    for i, p in enumerate(data["projects"]):
        project = projects.pop(p["slug"], None)
        fields = {k: v for k, v in p.items() if k not in {"technologies", "features", "nodes", "edges"}}
        if project is None:
            project = Project(**fields, order=i)
            db.add(project)
        else:
            for k, v in fields.items():
                setattr(project, k, v)
            project.order = i
            project.edges.clear()
            db.flush()
            project.nodes.clear()
            db.flush()
        project.technology_links.clear()
        db.flush()
        project.technology_links = [ProjectTechnology(technology_id=technologies[t].id, order=j) for j, t in enumerate(p["technologies"])]
        project.features = [ProjectFeature(description=f, order=j) for j, f in enumerate(p["features"])]
        project.nodes = [ArchitectureNode(**n) for n in p["nodes"]]
        db.flush()
        nodes = {n.key: n for n in project.nodes}
        project.edges = [ArchitectureEdge(source_node_id=nodes[e["source"]].id, target_node_id=nodes[e["target"]].id, label=e["label"]) for e in p["edges"]]
    for stale in projects.values():
        db.delete(stale)
    roles = {(e.company, e.position, e.start_date): e for e in db.scalars(select(Experience))}
    for e in data["experience"]:
        role = roles.pop((e["company"], e["position"], e["start_date"]), None)
        if role is None:
            role = Experience(**{k: v for k, v in e.items() if k not in {"highlights", "technologies"}})
            db.add(role)
        role.end_date, role.location = e["end_date"], e["location"]
        role.highlights = [ExperienceHighlight(description=h, order=i) for i, h in enumerate(e["highlights"])]
        role.technology_links.clear()
        db.flush()
        role.technology_links = [ExperienceTechnology(technology_id=technologies[t].id, order=i) for i, t in enumerate(e["technologies"])]
    for stale in roles.values():
        db.delete(stale)
    for model, key, values in [(Contribution, "url", data["contributions"]), (Certification, "title", data["certifications"])]:
        records = {getattr(r, key): r for r in db.scalars(select(model))}
        for value in values:
            record = records.pop(value[key], None)
            if record is None:
                db.add(model(**value))
            else:
                for k, v in value.items():
                    setattr(record, k, v)
        for stale in records.values():
            db.delete(stale)
    p = data["profile"]
    profile = db.get(CandidateProfile, 1)
    if profile is None:
        profile = CandidateProfile(id=1, **{k: v for k, v in p.items() if k != "roles"})
        db.add(profile)
    else:
        for k, v in p.items():
            if k != "roles":
                setattr(profile, k, v)
    profile.roles = [ProfileRole(title=r, order=i) for i, r in enumerate(p["roles"])]
    for old in db.scalars(select(Education)):
        db.delete(old)
    db.add_all([Education(**e) for e in data["education"]])
    db.flush()
    for name, t in technologies.items():
        if name not in wanted:
            db.delete(t)
    if revision is None:
        db.add(ContentRevision(key="active", digest=digest))
    else:
        revision.digest = digest
    db.commit()
    return True
