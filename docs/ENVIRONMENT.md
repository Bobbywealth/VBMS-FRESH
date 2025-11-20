# Environment Configuration

Set these variables locally (via `.env`) and in Render's dashboard.

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. Never commit the actual value. |
| `JWT_SECRET` | Long random string used to sign auth tokens. |
| `JWT_EXPIRES_IN` | Optional JWT lifetime (e.g. `8h`, `1d`). Defaults to `8h`. |
| `CORS_ORIGINS` | Comma-separated list of allowed origins (e.g. `https://vbms-fresh-official-website-launch.onrender.com`). |
| `PORT` | Port for local dev (defaults to `5000`). |

## Local development

1. Duplicate this file to `.env`.
2. Populate the variables with development-safe values.
3. Run `npm install && npm start`.

## Render deployment

1. Open your Render service settings.
2. Add/update each environment variable using the values from your secure vault.
3. Redeploy to apply the changes.

## Secret rotation checklist

- Generate a fresh `JWT_SECRET` whenever rotating credentials.
- Rotate `DATABASE_URL` credentials after auditing access.
- Review Render audit logs to ensure env changes are captured.
