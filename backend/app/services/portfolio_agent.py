"""A bounded career assistant. Models select facts; they never author career claims.

Memory is process-local, temporary and deliberately never written to the database.
Run one API worker for follow-up continuity, or add a TTL-only shared store before
scaling workers. Database rate limits remain shared across workers.
"""
import hashlib
import hmac
import json
import logging
import re
import threading
import time
import uuid
from dataclasses import dataclass, field
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.models import CandidateProfile, Education, Contribution, Certification
from app.services.portfolio import project_query, serialize_project, get_experience, get_skills
from app.services.contact import reserve_rate_limit
from app.schemas import AssistantResponse, AssistantAction, AssistantSource, EducationMilestone
from app.services.ai_service import development_warning
from urllib.error import HTTPError

logger = logging.getLogger(__name__)


@dataclass
class Visit:
    owner: str
    updated: float
    turns: int = 0
    topic: str = "profile"
    history: list[dict] = field(default_factory=list)
    busy: bool = False


_visits: dict[str, Visit] = {}
_lock = threading.Lock()
SCOPE = "I’m here to help with Ashish’s career, projects, skills, experience, education and resume. Try asking about KubASIE or his backend work."
MISSING = "The verified portfolio does not currently contain that information. You can ask Ashish directly through the contact section."
DEFINITIONS = {
    "docker": "Docker packages applications and dependencies into portable containers.",
    "kubernetes": "Kubernetes orchestrates containerized applications across machines.",
    "fastapi": "FastAPI is a Python framework for building web APIs.",
    "git": "Git is a version-control system for tracking changes to files.",
    "python": "Python is a general-purpose programming language.",
}


def knowledge(db: Session):
    p = db.get(CandidateProfile, 1)
    if not p:
        raise HTTPException(503, "The portfolio assistant is temporarily unavailable. Please explore the projects, experience and resume directly.")
    facts = {"profile": (p.summary, "Verified resume · profile"),
             "links": (f"GitHub: {p.github_url}. LinkedIn: {p.linkedin_url}.", "Verified resume · links"),
             "contact": (f"You can contact Ashish at {p.email}. Location: {p.location}.", "Verified resume · contact"),
             "resume": ("The latest verified resume is available through Download Resume.", "Latest resume")}
    projects = [serialize_project(x) for x in db.scalars(project_query().order_by("order"))]
    for x in projects:
        facts[f"project:{x.slug}"] = (f"{x.short_title}: {x.summary} {x.solution} Technologies: {', '.join(x.technologies)}.", f"Resume · {x.short_title}")
        facts[f"detail:{x.slug}"] = (f"{x.short_title} — Problem: {x.problem} Solution: {x.solution} Features: {'; '.join(x.features)}. Outcome: {x.outcome}", f"Project · {x.short_title}")
    exp = get_experience(db)
    facts["experience"] = (" ".join(f"{e.position}, {e.company} ({e.start_date}–{e.end_date}, {e.location}). {' '.join(e.highlights[:2])}" for e in exp), "Resume · experience")
    facts["experience:detail"] = (" ".join(f"{e.position}, {e.company} ({e.start_date}–{e.end_date}, {e.location}). {' '.join(e.highlights)} Technologies: {', '.join(e.technologies)}." for e in exp), "Resume · experience details")
    skills = get_skills(db)
    for category in sorted({s.category for s in skills}):
        facts[f"skills:{category.lower()}"] = (f"{category}: {', '.join(s.name for s in skills if s.category == category)}.", f"Resume · {category} skills")
    for s in skills:
        examples = [x.short_title for x in projects if s.name in x.technologies][:2]
        usage = "; ".join(s.usages)
        projects_text = f" Verified projects: {', '.join(examples)}." if examples else ""
        facts[f"technology:{s.name.lower()}"] = (f"Yes. {s.name} is listed in Ashish’s verified skills. {usage}.{projects_text}", f"Verified portfolio · {s.name}")
    facts["education"] = (" ".join(f"{e.qualification}, {e.institution}; {'expected ' if 'B.Tech' in e.qualification else 'completed '}{e.expected_year}; {e.grade}." for e in db.scalars(select(Education).order_by(Education.expected_year))), "Verified portfolio · education")
    facts["certifications"] = (" ".join(f"{c.title} — {c.issuer}, {c.year} ({c.kind})." for c in db.scalars(select(Certification))) + " AWS Cloud Practitioner Essentials is training; the resume does not claim AWS certification.", "Resume · training and credentials")
    facts["open-source"] = (" ".join(f"{c.repository} PR #{c.pr_number}: {c.description} Verified recorded status: {c.status}." for c in db.scalars(select(Contribution))), "Resume · open source")
    return facts, {x.slug for x in projects}


def retrieve(message: str, previous: str, facts: dict, section_id: str | None = None, project_id: str | None = None):
    q = message.lower()
    if re.search(r"ignore (all|previous)|system prompt|api.?key|physics|homework|assignment|recipe|weather|write.*(poem|essay|code)|politic", q):
        return [], "scope"
    if re.search(r"salary|age|date of birth|availability|visa|years of experience|certified|production (scale|users)|million|guarantee", q):
        if "certified" in q or "certification" in q:
            return ["certifications"], "certifications"
        return [], "missing"
    if re.search(r"education|academic|school|stud(y|ies|ied)|college|qualification|degree|university|cgpa|graduat|10th|12th", q):
        return ["education"], "education"
    if re.search(r"those tools|those technologies", q) and previous == "skills":
        return [key for key in facts if key.startswith("skills:")], "skills"
    topic = next((f"project:{slug}" for slug in ("kubasie", "kf-probe", "portfolio") if slug in q and (slug != "portfolio" or "project" in q)), "")
    # Visible context resolves only deictic questions. Explicit topics above and
    # below always take precedence over what happens to be on screen.
    contextual = bool(re.search(r"\b(here|this project|this one|this section|what did he do|what technologies were used|how does it work)\b", q))
    explicit_other = bool(re.search(r"education|school|college|open.?source|kubeflow|resume|github|linkedin|contact|email|hire|certificat", q))
    if not topic and contextual and not explicit_other and project_id and f"project:{project_id}" in facts:
        topic = f"project:{project_id}"
    if not topic and contextual and not explicit_other and section_id == "experience":
        return ["experience:detail"], "experience"
    if not topic and contextual and not explicit_other and section_id == "skills":
        return [key for key in facts if key.startswith("skills:")], "skills"
    if not topic and re.search(r"that project|strongest project", q):
        topic = previous if previous.startswith("project:") else "project:kubasie"
    followup = bool(re.search(r"^(and |what (tech|did|about)|how |tell me more|more detail|explain (more|it)|what about (it|that)|does (it|he)|show (it|that))", q))
    if not topic and (followup or re.search(r"\b(it|that)\b", q)) and previous.startswith("project:"):
        topic = previous
    if topic and topic in facts:
        key = topic.replace("project:", "detail:") if re.search(r"detail|architecture|how|explain|more", q) else topic
        return [key], topic
    tech = [k for k in facts if k.startswith("technology:") and re.search(r"(?<!\w)" + re.escape(k.split(":", 1)[1]) + r"(?!\w)", q)]
    if tech and not re.search(r"intern|kubeflow|contribut|github(?! actions)|linkedin|resume|certificat|credential|badge", q):
        return tech[:3] + (["project:kubasie", "project:kf-probe"] if "kubernetes" in q else []), "skills"
    if re.search(r"experience (with|in) |work(ed)? (at|for) ", q) and not re.search(r"real it|backend|devops|cloud|full.?stack", q): return [], "missing"
    for key, pattern in [("experience", r"intern|experience|deployment|endpoints"), ("open-source", r"open.?source|kubeflow|findmygsoc|contribut|pull request"), ("certifications", r"certificat|credential|training|badge"), ("resume", r"resume|download|cv\b"), ("links", r"github|linkedin"), ("contact", r"contact|email|location|ranchi")]:
        if re.search(pattern, q):
            return ["experience:detail" if key == "experience" and re.search(r"detail|more|explain", q) else key], key
    if re.search(r"does .*know |experience (with|in) |work(ed)? (at|for) |skill (in|with) |can he (use|build|write)", q):
        return [], "missing"
    if re.search(r"devops|ci/cd|cloud|backend|full.?stack|hire|suitable|strongest|projects|built", q):
        ids = []
        if re.search(r"backend|hire|suitable|devops|ci/cd", q): ids.append("experience")
        cats = ["devops", "cloud"] if re.search(r"devops|cloud|ci/cd", q) else ["backend"]
        ids += [f"skills:{c}" for c in cats if f"skills:{c}" in facts]
        ids += ["project:kubasie", "project:kf-probe"]
        if "full" in q: ids.append("project:portfolio")
        return ids[:4], "skills"
    if re.search(r"technolog|skills|know|stack", q):
        return [k for k in facts if k.startswith("skills:")], "skills"
    if re.search(r"ashish|about (him|you)|who|hello|hi\b|profile", q): return ["profile", "experience"], "profile"
    return [], "missing" if re.search(r"(he|his|ashish)\b", q) else "scope"


def model_select(message: str, visit: Visit, facts: dict, candidates: list[str]):
    from app.services.ai_service import configured_provider
    try:
        provider = configured_provider()
        if provider is None: return candidates, "grounded"
        selected = provider.generate_response({k: facts[k][0] for k in candidates}, message, visit.history)
        return selected, get_settings().ai_provider.lower()
    except Exception as error:
        logger.warning("Assistant provider failed: type=%s status=%s", type(error).__name__, error.code if isinstance(error, HTTPError) else "none")
        raise HTTPException(502, "The AI provider could not answer. Please try again shortly or explore the portfolio directly.")


def actions(ids: list[str], slugs: set[str]):
    result = []
    def add(kind, target, label):
        action = AssistantAction(type=kind, target=target, label=label)
        if action not in result: result.append(action)
    for key in ids:
        if key.startswith(("project:", "detail:")) and key.split(":", 1)[1] in slugs:
            slug = key.split(":", 1)[1]
            add("OPEN_PROJECT", slug, f"Explore {slug}")
        elif key == "links":
            add("OPEN_GITHUB", "github", "Open GitHub")
            add("OPEN_LINKEDIN", "linkedin", "Open LinkedIn")
        elif key == "resume": add("OPEN_RESUME", "resume", "Download Resume")
        elif key == "contact": add("OPEN_CONTACT", "contact", "Contact Ashish")
        elif key == "education": add("NAVIGATE_SECTION", "education", "View education")
        elif key in ("experience", "experience:detail", "open-source") or key.startswith(("skills:", "technology:")):
            target = "experience" if key.startswith("experience") else key if key == "open-source" else "skills"
            add("NAVIGATE_SECTION", target, f"View {target.replace('-', ' ')}")
    return result[:2]


def owner_hash(ip: str):
    return hmac.new(get_settings().ip_hash_secret.encode(), ("assistant:" + ip).encode(), hashlib.sha256).hexdigest()


def chat(db: Session, message: str, conversation_id: str | None, ip: str, section_id: str | None = None, project_id: str | None = None):
    s = get_settings()
    if s.assistant_mode != "grounded" and (not s.provider_api_key or not s.ai_model):
        raise HTTPException(503, f"Ask Spidey is not configured yet. The site owner must set {s.provider_key_name} on the backend.")
    owner, now = owner_hash(ip), time.monotonic()
    reserve_rate_limit(db, owner, s.assistant_rate_limit, s.assistant_window_seconds)
    db.commit()  # Reserve before any network cost, including provider errors.
    with _lock:
        for key in list(_visits):
            if now - _visits[key].updated > s.assistant_session_ttl_seconds and not _visits[key].busy: del _visits[key]
        visit = _visits.get(conversation_id or "")
        if visit and visit.owner != owner: raise HTTPException(404, "Conversation unavailable")
        if not visit:
            if len(_visits) >= s.assistant_max_sessions: raise HTTPException(429, "The assistant is busy. Please try again shortly.")
            conversation_id = str(uuid.uuid4())
            visit = _visits[conversation_id] = Visit(owner, now)
        if visit.busy: raise HTTPException(409, "Please wait for the current answer.")
        if visit.turns >= s.assistant_session_limit: raise HTTPException(429, "This conversation has reached its limit. Please explore the portfolio directly.")
        visit.busy, visit.updated = True, now
        visit.turns += 1
    try:
        facts, slugs = knowledge(db)
        ids, topic = retrieve(message, visit.topic, facts, section_id, project_id if project_id in slugs else None)
        mode = "grounded"
        if ids and topic != "education" and not all(key.startswith("technology:") for key in ids):
            ids, mode = model_select(message, visit, facts, ids)
        answer = "\n\n".join(facts[k][0] for k in ids) if ids else (SCOPE if topic == "scope" else MISSING)
        if ids and re.search(r"^(what is|explain)\b", message.lower()) and not re.search(r"\b(ashish|he|his|experience|portfolio|project)\b", message.lower()):
            term = next((key.split(":", 1)[1] for key in ids if key.startswith("technology:")), None)
            if term in DEFINITIONS:
                answer = DEFINITIONS[term] + "\n\n" + answer
        component, milestones = None, None
        if "education" in ids:
            records = list(db.scalars(select(Education).order_by(Education.expected_year)))
            narrow = re.search(r"\b(cgpa|percentage|percent|grade|score)\b", message.lower()) and not re.search(r"timeline|background|all|complete|education", message.lower())
            if narrow:
                requested = next((e for e in records if re.search(r"10th|tenth", message.lower()) and "10th" in e.qualification or re.search(r"12th|twelfth", message.lower()) and "12th" in e.qualification), None)
                if requested is None:
                    requested = next((e for e in records if "B.Tech" in e.qualification), None)
                if requested:
                    answer = f"Ashish's {requested.qualification} result is {requested.grade}."
            elif len(records) == 3:
                answer = "Here is Ashish's educational journey. His B.Tech graduation is expected in 2027."
                component = "education_timeline"
                milestones = [EducationMilestone(level=e.qualification.replace(" in Computer Science Engineering", " (CSE)"), institution=e.institution, year=f"Expected {e.expected_year}" if "B.Tech" in e.qualification else str(e.expected_year), score=e.grade.split("/")[0].replace("CGPA: ", "") + (" CGPA" if "CGPA" in e.grade else "")) for e in records]
        if re.search(r"hire|suitable|strongest", message.lower()) and ids:
            answer = "These verified examples support a conversation about his fit for the role:\n\n" + answer
        explicit_project = bool(re.search(r"\b(project|kubasie|kf-probe)\b", message.lower())) or bool(re.search(r"\b(this|here)\b", message.lower()) and project_id)
        card_slug = next((k.split(":", 1)[1] for k in ids if k.startswith(("project:", "detail:"))), None) if explicit_project else None
        card = next((serialize_project(p) for p in db.scalars(project_query()) if p.slug == card_slug), None) if card_slug in slugs else None
        result = AssistantResponse(conversation_id=conversation_id, answer=answer, suggested_actions=actions(ids, slugs) if ids else [AssistantAction(type="NAVIGATE_SECTION", target="contact", label="Contact Ashish")], sources=[AssistantSource(id=k, label=facts[k][1]) for k in ids], mode=mode, warning=development_warning() if mode == "grounded" else ("Spidey is having trouble accessing the portfolio assistant right now. You can still explore the projects, experience, skills, and resume directly. Showing verified portfolio retrieval." if mode == "grounded-fallback" else None), ui_component=component, data=milestones, project_card=card)
        with _lock:
            visit.topic = topic if topic not in ("scope", "missing") else visit.topic
            visit.history = (visit.history + [{"question": message, "fact_ids": ids}])[-6:]
        return result
    finally:
        with _lock: visit.busy, visit.updated = False, time.monotonic()


def clear(conversation_id: str, ip: str):
    with _lock:
        visit = _visits.get(conversation_id)
        if visit and visit.owner != owner_hash(ip): raise HTTPException(404, "Conversation unavailable")
        if visit and visit.busy: raise HTTPException(409, "Please wait for the current answer.")
        _visits.pop(conversation_id, None)
    return {"cleared": True}
