# ROZNEX Portfolio

ROZNEX portfolio and private project management dashboard.

## Deploy to Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/RozhanB01/roznex-portfolio)

The Render Blueprint creates a Node web service in Frankfurt.

During setup, set:

- `ROZNEX_ADMIN_PASSWORD_HASH` — SHA-256 hash of the private dashboard password. Do not commit the password or its hash to the repository.
- `ROZNEX_ADMIN_SESSION_SECRET` — optional extra random secret for stateless admin sessions. If omitted, the configured admin password hash is used as the session signing secret.
- `ROZNEX_BLOB_READ_WRITE_TOKEN` — read/write token from the connected Vercel Blob store. Required for persistent projects, images, and project-request inbox storage.\n- `ROZNEX_QUOTE_CATALOG_JSON` — private JSON catalog for SmartQuote pricing. Keep this only in the deployment environment; never commit prices to the repository.

After deployment:

- `/` — portfolio
- `/admin` — private control panel
- `/health` — Render service health
- `/api/storage-health` — Blob/storage diagnostic
