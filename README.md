# GitHub folder

This folder is intentionally minimal — no CI workflow is included by default.

Why: a workflow that deploys on every push requires repository secrets
(`DATABASE_URL`, `AUTH_SECRET`) to be configured first, and Vercel's own Git
integration is simpler and free. See `docs-deploy-ar.md` for the recommended flow:

1. Push this repository to GitHub.
2. Import it into Vercel and set the environment variables there.
3. Vercel builds and deploys on every push automatically.

If you later prefer GitHub Actions, add `.github/workflows/ci.yml` that runs:
`npm ci && npm run lint && npm run typecheck && npm run build`
