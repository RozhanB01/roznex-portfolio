# ROZNEX Portfolio

ROZNEX portfolio and private project management dashboard.

## Deploy to Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/RozhanB01/roznex-portfolio)

The Render Blueprint creates a Node web service in Frankfurt.

During setup, set:

- `ROZNEX_BLOB_READ_WRITE_TOKEN` — copy the read/write token from the connected Vercel Blob store.

After deployment:

- `/` — portfolio
- `/admin` — private control panel
- `/health` — Render service health
- `/api/storage-health` — Blob/storage diagnostic
