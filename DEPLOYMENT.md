# Deployment and rollback

This repository uses the existing Vercel project `port-folio` for the frontend, Render service `ashish-spidey-api-dqj3` for FastAPI, and Neon PostgreSQL for persistent data. The production website is https://port-folio-delta-wine.vercel.app/. The `main` branch is the frontend production branch; `new-spiderman-portfolio` has been used for previews. Check the effective service settings before each release because dashboard settings can differ from repository configuration.

## Configuration

- Vercel builds the repository-root `vercel.json`, which installs and builds `frontend/`. Set `VITE_API_BASE_URL` to the Render origin without an `/api` suffix. This is a public build-time variable; rebuild after changing it.
- Render builds `backend/Dockerfile` with the repository root as context. Its health check is `/api/ready`. The container applies Alembic migrations and seeds verified portfolio content before serving requests.
- Keep `DATABASE_URL`, `AI_API_KEY`, `EMAIL_API_KEY`, `EMAIL_FROM_ADDRESS`, `CONTACT_RECEIVER_EMAIL`, and `IP_HASH_SECRET` in Render's private environment. Never place them in Vercel's frontend variables or commit `.env` files. Configure `CORS_ORIGINS` with exact production and preview origins.
- `render.yaml` describes the intended service configuration. Confirm the connected branch and auto-deploy setting in Render before relying on it. A manual deployment of a specific commit can leave auto-deploy disabled.

Contact messages are committed to PostgreSQL before Resend is called. Their delivery status is tracked as `SENT`, `FAILED`, or `DISABLED`; an HTTP 201 contact response confirms storage, not inbox delivery. Failed messages are not retried automatically.

## Release checks

1. Review the candidate commit and changed files. Run the backend tests, frontend tests, and production build. Check GitHub CI and the Vercel preview.
2. Confirm the current Render and Vercel deployment commits, environment, and rollback targets. Record the contact-message count and delivery statuses before deploying backend changes.
3. Deploy the approved backend commit to the existing Render service. Wait for the deploy to become live and confirm `/api/health`, `/api/ready`, and `/api/profile` over HTTPS.
4. Test the deployed assistant through the API and browser with a fourth question and contextual follow-ups in one conversation. Verify Clear Conversation. Check contact storage and, with an authorized test recipient, Resend delivery separately.
5. Promote or merge the approved frontend change only after confirming compatibility with the deployed backend. Check the production website, resume asset, navigation, 3D companion, contact form, and browser console.

Confirm the exact live commit in Render before treating a branch or preview as production-tested.

## Rollback

For backend failures, redeploy the last known-good commit or deployment in the existing Render service. Preserve the Neon database and contact records; review migration compatibility before rolling code back. Do not replay failed email notifications without checking whether Resend accepted the original request.

For frontend failures, restore the previous known-good Vercel production deployment or revert the merge on `main`. Avoid force-pushing or deleting the existing project. Recheck `/api/ready`, assistant conversations, and contact persistence after rollback.

## Troubleshooting

- `/api/ready` fails: inspect Render startup logs, migration output, database connectivity, and seed status.
- Browser requests target localhost: rebuild Vercel with the correct `VITE_API_BASE_URL`.
- Browser reports CORS errors: add the exact website origin to `CORS_ORIGINS` and redeploy the API.
- Chat returns 502 or 503: inspect sanitized backend diagnostics and provider configuration. Preserve the request ID when investigating.
- Contact returns 201 but no email arrives: check the private delivery status and sanitized Resend error; the inquiry may still be stored.
