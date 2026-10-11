# Ashish Kumar Ishwar — Portfolio

A full-stack portfolio built with React, TypeScript, Vite, and FastAPI. It features an interactive 3D companion, project case studies, a source-grounded career assistant, and a contact form backed by PostgreSQL.

## Project structure

| Path | Purpose |
| --- | --- |
| `frontend/` | Website, 3D companion, and frontend tests |
| `backend/` | FastAPI routes, services, database models, migrations, and tests |
| `content/portfolio.json` | Verified portfolio content used to seed the database |
| `render.yaml` | Render service configuration |
| `vercel.json` | Vercel frontend build configuration |

## Run locally

Use Node.js 22 and Python 3.12 or newer. Start with a local PostgreSQL database, or set `DATABASE_URL=sqlite:///./preview.db` for a local preview.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
Copy-Item ..\.env.example .env
# Edit .env with a local DATABASE_URL and distinct development secrets.
python -m alembic upgrade head
python -m app.seed
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

In another terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Vite proxies `/api` to the local backend. See [CHATBOT_SETUP.md](CHATBOT_SETUP.md) to enable Groq, or set `ASSISTANT_MODE=grounded` to use retrieval without a provider.

For Docker Compose, copy `.env.example` to `.env`, set the database and secret values, then run `docker compose up --build -d`. Open http://localhost:8080. Compose runs migrations and seeds the database before serving the site.

## Verify

```powershell
cd frontend
npm test
npm run build
cd ..\backend
python -m pytest tests -q
```

The frontend HTTP integration test needs `PORTFOLIO_TEST_PYTHON` set to a Python executable with the backend test dependencies installed. Without it, that test is skipped.

## Deployment

The frontend is hosted on Vercel, the API on Render, and production data in Neon PostgreSQL. Secrets belong only in the backend environment. Use the existing services and follow [DEPLOYMENT.md](DEPLOYMENT.md) for release checks and rollback. Contact messages are stored before email notification is attempted; a successful form submission confirms storage, while email delivery is tracked separately.

The supplied portrait and resume are included for this portfolio. The character is a procedural model; no external 3D asset is required. Spider-Man is a third-party character, and the site claims no affiliation.
