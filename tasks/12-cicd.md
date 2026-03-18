# Task 12 — CI/CD & Deployment Config

**Agent:** architect
**Status:** PENDING
**Depends on:** Tasks 01, 11 complete

## Context
GitHub Actions CI pipeline that runs on every PR. Deployment config for Vercel/Netlify.
The app needs proper env var management for production Jira credentials.

## Steps

### 1. Create GitHub Actions CI (`.github/workflows/ci.yml`)
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm run format:check
      - run: npm run test:coverage
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
          retention-days: 7
```

### 2. Create Vercel config (`vercel.json`)
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "env": {
    "VITE_JIRA_HOST": "@jira-host",
    "VITE_JIRA_EMAIL": "@jira-email",
    "VITE_JIRA_API_TOKEN": "@jira-api-token",
    "VITE_JIRA_PROJECT_KEYS": "@jira-project-keys",
    "VITE_HIERARCHY_STRATEGY": "@hierarchy-strategy"
  }
}
```

### 3. Create Netlify config (`netlify.toml`)
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 4. Add PR template (`.github/pull_request_template.md`)
```markdown
## Task
Closes task: `tasks/NN-*.md`

## Changes
-

## Acceptance Criteria Checklist
- [ ] All AC from task file are met
- [ ] `npm run build-all` passes locally
- [ ] Tests added/updated

## Screenshots (if UI change)
```

### 5. Protect main branch (document in README)
Add to README: instructions for GitHub branch protection:
- Require CI to pass before merge
- Require 1 review
- No force-push to main

## Acceptance Criteria
- [ ] CI workflow file passes YAML lint
- [ ] `vercel.json` has correct SPA rewrite rule
- [ ] PR template created
- [ ] `.gitignore` has `dist/` and `.env*` excluded

## Output
Update TASK_REGISTRY.md:
- Mark 12 `DONE`: "CI/CD: GitHub Actions + Vercel/Netlify deploy config"
- All tasks complete! App is ready for deployment.
