# Ask Spidey — Groq setup

The default provider is **Groq**. The backend first requests **`llama-3.1-8b-instant`**. Groq [deprecated that model for free and developer-tier accounts](https://console.groq.com/docs/deprecations), so a `model_not_found` response automatically retries Groq's supported replacement, **`openai/gpt-oss-20b`**. No OpenAI key or extra SDK installation is required. The backend validates returned portfolio fact IDs with either model.

## Add your key

For local development, edit `backend/.env` and fill in:

```dotenv
AI_API_KEY=your_groq_api_key_here
```

Provider/model/mode defaults are already configured. Keep your existing database settings. The backend reads `backend/.env` by absolute path, so launching from another working directory does not change which key file is loaded.

Get your key from [Groq Console](https://console.groq.com/keys). Keep it in the backend environment; never put it in a frontend or `VITE_` variable.

Restart the backend after changing the file. With the existing dependencies installed and database migrated/seeded, run from `backend`:

```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Keep the frontend running with `npm run dev` from `frontend`, then open http://127.0.0.1:5173 and ask about KubASIE. Vite already proxies `/api` to port 8000.

## First-time database setup

Adding the key enables the provider; the existing FastAPI backend and seeded database must also be available. If this is your first backend launch:

```powershell
python -m pip install -r requirements.txt
python -m alembic upgrade head
python -m app.seed
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

If local PostgreSQL is unavailable, an optional local preview can use `DATABASE_URL=sqlite:///./preview.db` in `backend/.env`, followed by the same migration/seed commands. Preserve your PostgreSQL configuration for deployment.

## Docker Compose

For Docker, put `AI_API_KEY` in the **project-root `.env`**, alongside existing database and deployment settings. Compose forwards the key and defaults to Groq/Llama automatically.

```powershell
docker compose up --build -d
```

Compose runs migrations and seeds the database before serving. After later key edits, recreate the backend with `docker compose up -d --force-recreate backend`.

## Verify

```powershell
$body = @{ message = 'Explain KubASIE'; conversation_id = $null } | ConvertTo-Json
$reply = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/api/assistant/chat -ContentType application/json -Body $body
$reply | Select-Object mode, answer
```

Provider-backed replies report `mode: groq` and the panel shows **Groq AI · verified portfolio facts**. The server still builds professional claims and actions from verified database records. Conversation context and history remain temporary, bounded and visitor-specific.

HTTP 503 indicates missing backend key/configuration. HTTP 502 indicates a Groq authentication, quota, network or invalid-response failure. HTTP 429 indicates the application's rate limit. Explicit `ASSISTANT_MODE=grounded` is retrieval-only; use `auto` for Groq. Direct portfolio links remain available if chat fails.

The existing `AI_API_KEY` field is the sole provider key field. Optional overrides are `AI_PROVIDER=groq`, `AI_MODEL=llama-3.1-8b-instant`, and `ASSISTANT_MODE=auto`. OpenAI is retained only as an explicitly selected optional provider.

The model's [official documentation](https://console.groq.com/docs/model/llama-3.1-8b-instant) lists JSON object mode. This is not strict provider-side JSON-schema enforcement, so the backend validates the shape, ID membership, item types/count and completion status before accepting output.

No real key is shipped. The configured local key was verified with a live Groq request through the fallback path; your key stays in the ignored `backend/.env` file.
