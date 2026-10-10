> October 9 update: wave visibility, local scroll recovery, distance-appropriate travel, object reactions and outside-click chat closing are implemented. See [VERIFICATION.md](VERIFICATION.md) for tests, browser evidence and remaining acceptance checks, and [CHATBOT_SETUP.md](CHATBOT_SETUP.md) for AI setup.

Production rollout into the **existing** Vercel project is documented in [DEPLOYMENT.md](DEPLOYMENT.md). The current public site remains untouched until the preview and backend pass acceptance checks and the owner approves cutover.

# Ashish Kumar Ishwar — Interface to Infrastructure

A complete React/TypeScript portfolio with a FastAPI API, normalized PostgreSQL content, persistent contact messages, and a procedural interactive 3D Spider-Man navigation companion and a source-grounded career assistant inspired by the supplied reference.

## Architecture

```mermaid
flowchart LR
  Browser --> Nginx
  Nginx --> React[React + TypeScript + Vite]
  React --> Scene[Lazy React Three Fiber scene]
  Nginx --> API[FastAPI]
  API --> Validation[Pydantic]
  Validation --> Services[Content and contact services]
  Services --> ORM[SQLAlchemy]
  ORM --> PostgreSQL[(PostgreSQL)]
  Alembic --> PostgreSQL
  Seed[Resume JSON seed] --> PostgreSQL
```

The frontend requests content through `/api`. During API outages it renders the same checked-in resume snapshot, with the source indicated in the footer. Contact submission always requires the backend; it never reports false success while offline. Case-study dialogs use the returned project data, including relational architecture nodes and edges.

## Run with Docker

Requires Docker Desktop with the Linux container engine running, or Docker Engine with the Compose plugin.

```powershell
Copy-Item .env.example .env
# Edit .env: set POSTGRES_PASSWORD and IP_HASH_SECRET to separate random values.
docker compose up --build -d
```

Open http://localhost:8080. Compose waits for PostgreSQL, runs Alembic migrations, seeds initial content, starts FastAPI, then starts Nginx. Only the frontend port is published. PostgreSQL is stored in a named volume.

```powershell
docker compose logs -f backend
docker compose ps
docker compose down
```

`docker compose down` preserves database data. Do not use `down -v` unless you intend to delete it. The private Docker subnet is `172.29.10.0/24`; adjust all static addresses together if it conflicts with your existing networks.

## Local development

Requires Node.js 22 and Python 3.12+, plus PostgreSQL for the normal development database.

```powershell
cd frontend
npm ci
npm run dev
```

In a second terminal:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
Copy-Item ..\.env.example .env
# Add DATABASE_URL=postgresql+psycopg://USER:PASSWORD@localhost:5432/portfolio
# Set ENVIRONMENT=development and development CORS_ORIGINS.
python -m alembic upgrade head
python -m app.seed
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Vite at http://127.0.0.1:5173 proxies `/api` to FastAPI on port 8000. Interactive API documentation is at http://127.0.0.1:8000/api/docs in development. API docs are disabled in production.

For a database-free local preview only, set `DATABASE_URL=sqlite:///./preview.db` before migration, seed, and server commands. SQLite is a preview/test fallback. PostgreSQL is the intended deployment database; its row locks protect the contact rate limit across workers.

For a single-process preview after building the frontend, set `SERVE_FRONTEND=true` and run Uvicorn on your preferred local port. FastAPI then serves `frontend/dist` and the API together, without a development proxy. Docker production still uses Nginx.

## Environment variables

| Variable | Purpose |
|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Compose database credentials |
| `DATABASE_URL` | SQLAlchemy URL for a local or independently deployed API |
| `IP_HASH_SECRET` | Private HMAC secret for anonymized rate-limit identity |
| `CORS_ORIGINS` | Comma-separated exact origins; wildcard origins are rejected |
| `ENVIRONMENT` | `development` or `production` |
| `CONTACT_RATE_LIMIT` | Accepted messages per IP bucket; default 5 |
| `CONTACT_WINDOW_SECONDS` | Rate-limit window; default 3600 |
| `TRUSTED_PROXY_IPS` | Uvicorn trusted proxy addresses; Compose trusts only Nginx |
| `FRONTEND_PORT` | Published Compose port; default 8080 |
| `SITE_URL` | Public origin used for canonical, social metadata, and sitemap |
| `VITE_API_BASE_URL` | Optional frontend API origin; default same origin |
| `SEED_FILE` | Optional override of the initial content JSON path |
| `AI_API_KEY`, `AI_PROVIDER`, `AI_MODEL`, `ASSISTANT_MODE` | Existing key field powers Groq; the preferred Llama 3.1 model falls back to Groq GPT-OSS 20B if unavailable |
| `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM_ADDRESS`, `CONTACT_RECEIVER_EMAIL` | Optional email notification configuration |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_STARTTLS`, `SMTP_SSL` | SMTP connection/authentication/TLS |
| `FRONTEND_URL` | Intended frontend origin reference |
| `SERVE_FRONTEND` | Serve the built frontend from FastAPI for a single-process preview; default false |

Experience dates preserve the resume's month-level precision as `YYYY-MM` strings; no exact employment start or end day is invented.

Use URL-safe database passwords in Compose, or percent-encode credentials in an explicitly configured `DATABASE_URL`. Never commit `.env` files. A production API refuses to start with the development IP hashing secret.

## Database and content

`content/portfolio.json` is the single bootstrap content source, grounded in the supplied resume and the verified additional pull request. The revision-aware sync is idempotent. A changed approved snapshot updates matching projects and experience, replaces their ordered details, and removes unsupported content entries. Stable project IDs and all contact messages remain intact. Migration `0002` adds the candidate profile, ordered roles, education, and revision tracking. Migration `0003` adds contact workflow and notification status with database constraints, preserving existing messages. See `RESUME_CHANGES.md` for the updated resume comparison.

Tables: `projects`, `project_features`, `technologies`, `technology_usages`, `project_technologies`, `project_architecture_nodes`, `project_architecture_edges`, `experiences`, `experience_highlights`, `experience_technologies`, `contributions`, `certifications`, `contact_messages`, `rate_limit_buckets`, `candidate_profile`, `profile_roles`, `education`, and `content_revisions`.

Architecture edges reference node IDs. Project and experience technologies use association tables. Features and highlights are ordered rows; content is not stored in large JSON database columns.

```powershell
cd backend
python -m alembic current
python -m alembic upgrade head
# After a reviewed model change:
python -m alembic revision --autogenerate -m "Describe the schema change"
```

The content keeps these distinctions explicit:

- KubASIE predicts up to 60 minutes ahead; no throughput, accuracy, or savings figures are invented.
- The workload chart is visibly labeled illustrative. The architecture diagram is a conceptual view of resume-supported components; it does not claim undocumented implementation wiring.
- Kubeflow website PR #4326 is documented as merged. Pipelines PR #12989 is described as a contribution, without an invented merge status.
- [FindMyGSoC PR #742](https://github.com/S3DFX-CYBER/FindMyGSoC/pull/742) was verified through GitHub metadata as merged on 16 May 2026. The summary describes its navbar reordering and issue #699; no technologies were inferred.
- Cloud Practitioner Essentials is training, not an AWS Certified Cloud Practitioner claim.
- Only the prior portfolio has a resume-provided live demo URL.
- Project outcomes describe delivered capabilities. Unreported engineering challenges are not fabricated.

## API

| Method | Path | Behavior |
|---|---|---|
| GET | `/api/projects` | Ordered project data and case studies |
| GET | `/api/projects/{slug}` | Project or a 404 response |
| GET | `/api/skills` | Categories and usage context |
| GET | `/api/experience` | Experience timeline |
| GET | `/api/contributions` | Open-source work |
| GET | `/api/certifications` | Training and credentials |
| GET | `/api/profile` | Verified candidate profile |
| GET | `/api/education` | Verified education |
| POST | `/api/assistant/chat` | Bounded career questions, sources and safe actions |
| POST | `/api/assistant/clear` | Clear this visitor’s temporary conversation |
| POST | `/api/contact` | Validate and persist a message |
| GET | `/api/health` | Liveness |
| GET | `/api/ready` | Database connectivity |

Contact payload:

```json
{
  "name": "Alex Morgan",
  "email": "alex@example.com",
  "subject": "Engineering opportunity",
  "message": "I would like to discuss a full-stack engineering opportunity.",
  "website": "",
  "started_at": 1791216000000
}
```

`started_at` is the actual form-open Unix timestamp in milliseconds. Submission requires 2 seconds to 24 hours elapsed. The hidden `website` honeypot must be empty. Pydantic rejects extra fields, invalid email addresses, control characters, and invalid field lengths. Nginx and the API enforce 32 KiB bodies, including streamed request bodies. Rate-limit reservations and message insertion share a database transaction; PostgreSQL uses a shared locked bucket, so multiple workers cannot independently accept five messages each.

No public endpoint exposes stored messages. `notify_new_contact` supports Resend HTTPS delivery or optional SMTP after storage; a missing provider records `DISABLED` and an email failure records `FAILED`. Live delivery is not claimed without credentials and a provider check. The form explicitly reports database receipt.

## Character and motion

The existing procedural chibi model and suit remain in place. The corrected engine is the sole authority for visible position; it initializes while hidden at a validated support and integrates all later movement with bounded speed and acceleration. Scroll selects destinations, and the character catches up through a continuous route.

- `frontend/src/three/AnchorManager.ts` discovers painted headings, card edges, image frames, navigation borders and safe structural objects. Hidden, transparent, occluded, tiny and critical elements are rejected. Text points use rendered glyph ink instead of heading centres. Every point belongs to an actual hit-tested element.
- Anchor roles separate `REST_ANCHOR`, `PERCH_ANCHOR`, `WEB_ANCHOR`, `HANG_ANCHOR`, `TRAVEL_ANCHOR` and `INTERACTION_ANCHOR`. Card corners and bottom edges expose different roles. There are no artificial viewport-margin anchors.
- `frontend/src/companion/planner.ts` builds a bounded graph through actual supported objects. Legs aim, shoot, attach, swing or pull, release, jump and land when the geometry permits. Clearance waypoints never become supports or web endpoints. Invalid plans keep the current valid support; unsupported flight continues toward recovery.
- Cursor/chat requests complete the current leg before looking or entering an AI pose. The previous state, destination, route, progress, web and remaining legs are retained. After cursor inactivity, unfinished legs resume or replan from the supported position.
- A hanging pose retains its actual web even during cursor and AI states. Web tips extend from the model hand. Active support/web/destination objects have live transformed measurements; unconnected candidates use cached geometry and batched discovery. Scroll does not assign the character position.
- Small heading/card tilts use reversible Web Animations; paragraphs, contact fields and navigation labels are not manipulated. The original static portrait is retained. Its responsive shoulder marker is validated against the actual visible photo, and a completed shoulder visit is recorded once per session.
- The full 3D scene loads without first displaying a differently positioned desktop SVG. Renderer changes reuse the same engine state so a responsive switch does not reset the visible position. Mobile/low-memory/reduced-motion uses the lightweight model and a real endpoint-tracked SVG web. Autonomous idle traversal is disabled for reduced motion; scrolling still uses bounded movement.

Ask Spidey and Hide Spidey sit at the right desktop edge, with safe-area-aware lower-right mobile controls. The model hitbox and Ask button call the same `openSpideyAssistant()` action. An active character reaches support before the short reaction opens chat. With the character disabled or unavailable, the button opens normally. Hiding unmounts observers/listeners after the existing fade and preserves the session preference.

In development, `?spideyDebug=1` shows state, support/web validity, cursor stop status, route steps and anchor dots (green valid, red rejected, yellow destination). Support, hanging-web and bounded-displacement assertions are guarded by `import.meta.env.DEV` and removed from production builds. Final visual placement and performance still require browser review; automated geometry checks are not a visual certification.

## Ask Spidey

The premium floating panel uses a mobile bottom sheet, visit history, starter questions, concise source-labelled replies, clear/close controls, and explicit action buttons. It is nonmodal so visitors can keep exploring the website. Escape closes it and focus returns to the opener. Contact submission and content work independently of the assistant.

`POST /api/assistant/chat` accepts `{ "message": "Explain KubASIE", "conversation_id": null }`. The response contains `conversation_id`, `answer`, `sources`, `suggested_actions`, `mode`, and an optional `warning`. `app/services/ai_service.py` defines the provider boundary; Groq is the default implementation. Subsequent questions send the returned ID. `POST /api/assistant/clear` removes temporary in-process conversation memory.

Default `ASSISTANT_MODE=auto`, `AI_PROVIDER=groq` and `AI_MODEL=llama-3.1-8b-instant` enable Groq when its key is present. Missing credentials return HTTP 503; provider/network/invalid-output failures return HTTP 502. Intentional `ASSISTANT_MODE=grounded` uses deterministic retrieval without a provider.

To enable Groq, add just this line to **backend/.env** and restart the running backend (use the root `.env` for Docker Compose):

```dotenv
AI_API_KEY=your-server-side-groq-key
```

Groq receives relevant verified facts and up to four recent questions through Chat Completions JSON mode. The server independently validates the response shape and rejects unknown IDs, then assembles the answer from trusted database text. Provider text cannot supply career claims, arbitrary URLs or actions. Successful provider-backed responses report `mode: groq`. No new Python SDK dependency is required. See [Groq's model documentation](https://console.groq.com/docs/model/llama-3.1-8b-instant) and [CHATBOT_SETUP.md](CHATBOT_SETUP.md).

Both server and frontend allow only `NAVIGATE_SECTION`, `OPEN_PROJECT`, `OPEN_GITHUB`, and `DOWNLOAD_RESUME`. Actions require a visitor click. Project targets must match an existing project; section targets must match the fixed navigation list. The client supplies no raw PDF or private assistant context.

Controls: 1,000-character input, 15-second provider timeout, 30 requests per IP per hour, 30 turns per conversation, 30-minute inactivity expiry, and at most 500 temporary visits. Database rate reservations commit before provider cost. Visit IDs are random UUIDs bound to the hashed visitor identity. Scope guards redirect unrelated requests; unavailable facts produce an explicit unknown answer. Provider/API failures leave direct project and resume actions available.

Memory is **temporary and process-local**. The supplied Docker command runs one API worker. Multiple workers preserve shared database abuse limits, but follow-up memory needs a separate TTL-only store or sticky routing before scaling. No conversation table or persistent message logging is added.

No GLB is downloaded, so Draco/Meshopt compression is not applicable to this procedural model. If replacing it with an authored rig, export a single compressed GLB, use Meshopt or Draco, KTX2 textures, and a low-detail mobile variant. Keep the controller and anchor API while swapping the model/pose adapter.

## Contact notifications

`POST /api/contact` validates and commits the inquiry before confirming receipt. Messages are private and retain workflow `status` (`NEW`, `READ`, `REPLIED`, `SPAM`) and separate `email_delivery_status` (`PENDING`, `SENT`, `FAILED`, `DISABLED`). There are no public message-read or administration endpoints. The existing honeypot, minimum submission time, field limits and database-backed rate limits remain.

For the free Render deployment, configure server-side `EMAIL_PROVIDER=resend`, `EMAIL_API_KEY`, `EMAIL_FROM_ADDRESS` and `CONTACT_RECEIVER_EMAIL`. The backend sends a plain-text HTTPS request to Resend with a per-message idempotency key. SMTP remains an optional alternative on hosts that allow it: set `EMAIL_PROVIDER=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME` and `SMTP_PASSWORD`. No credentials enter the browser bundle.

Notification content is plain text with the sender name/email, subject, message and UTC submission timestamp. User input is never rendered as HTML or used in the notification subject header. Delivery runs after the database commit; failures preserve the inquiry, mark delivery `FAILED` and log a redacted error. A sent form means the backend stored the message, not that an email reached an inbox.

Without email configuration, development logs exactly `Email notification disabled in development.` and delivery is `DISABLED`; storage continues. Live Resend delivery requires owner-provided configuration and an actual provider check. `FRONTEND_URL` records the intended frontend origin; `CORS_ORIGINS` remains the explicit API origin allowlist.

## Production build and deployment

```powershell
cd frontend
$env:SITE_URL = "https://your-real-domain.example"
npm run build
npm run preview
```

`SITE_URL` must be the actual deployment origin, without a path. Builds generate canonical/OpenGraph/Twitter metadata, `robots.txt`, and `sitemap.xml`, and calculate the CSP hash for structured data. The default origin is localhost for local setup; replace it before publishing.

For Compose production deployment, set `SITE_URL` and `CORS_ORIGINS` in `.env`, then rebuild. Put HTTPS termination in front of Nginx; configure your real hostname and HTTPS redirect in that reverse proxy. Use managed backups for PostgreSQL and keep credentials in the hosting platform's secret store. Do not expose the database or unauthenticated message administration endpoints.

Frontend and API may also be deployed separately. Build with `VITE_API_BASE_URL`, set exact API CORS origins, and adapt Nginx CSP `connect-src` to that API origin. For that topology, serve the frontend build directly or configure its proxy for the real backend instead of the Compose service name. Docker Compose is the supplied integrated deployment.

## Performance and accessibility

The 3D scene is dynamically imported after the main UI. No 3D is loaded for the mobile/reduced-motion fallbacks. Pixel density is capped at 1.5. Geometry and texture resources are reused; frame updates write directly to Three.js objects. The portrait is optimized WebP. Fonts are self-hosted with swap behavior and accompanying licenses. Nginx compresses static content and caches assets. Motion hierarchy keeps section and micro-interactions quieter than the character.

Navigation is semantic, mobile menus expose expanded state, active sections expose location, forms have labels and browser validation, and project dialogs use the native keyboard/focus-trapping dialog element. Escape closes the dialog. Focus styles, a skip link, reduced-motion support, and external-link descriptions are included. The custom glow supplements the ordinary cursor rather than hiding it.

No Lighthouse score or 60 FPS result is claimed without a measured audit on the final host and target hardware.

## Verification

```powershell
cd frontend
npm test
npm run build
cd ..\backend
python -m pytest -q
```

Backend tests use isolated SQLite databases and exercise profile grounding, schema-constrained provider selection/failure, contact persistence, workflow status, Resend HTTPS and plaintext SMTP transport, and delivery failure preservation. Motion/DOM tests exercise physical support, safe-stop interruption, bounded scrolling/reversal, endpoint tracking, chained routes, protected UI and responsive collision bounds. These do not certify PostgreSQL locking or browser visuals.

To run the rendered frontend-to-FastAPI HTTP integration test, set `PORTFOLIO_TEST_PYTHON` to your Python executable (with backend and test requirements installed), then run `npm test`. The harness starts a temporary loopback API on a fresh ephemeral port and uses the real frontend components/services and actual HTTP requests. It verifies chat, stored contact success, database failure UI, and retention after mail failure. It uses an isolated SQLite database and does not send real email. Test-only diagnostic routes exist only in `backend/tests/ui_server.py`; the production application never imports that harness. Without the variable, this integration test is explicitly skipped.

See `VERIFICATION.md` for the actual checks and environment limitations from this build.

## Assets and ownership

The supplied portrait and resume are included for your portfolio. The Spider-Man reference is retained under `references/` for design context and is excluded from the Docker image. The procedural character uses no downloaded third-party 3D model. Google Fonts license files are included beside the font files. Spider-Man remains a third-party character; no affiliation is claimed by the site.

<!-- Trigger fresh Vercel preview build -->
