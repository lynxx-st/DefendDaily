# Steps 1.03–1.04: Docker Compose + Environment Variables

## 1.03 infra/docker-compose.yml

```yaml
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: defenddaily
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

Start infrastructure:
```bash
docker compose -f infra/docker-compose.yml up -d
```

Verify both containers are healthy:
```bash
docker compose -f infra/docker-compose.yml ps
# Both should show "healthy" status
```

## 1.04 .env.example

Create `.env.example` with ALL variables (copy from CLAUDE.md §9):

```bash
# Server
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/defenddaily
REDIS_URL=redis://localhost:6379

# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...

# Microsoft Teams
TEAMS_APP_ID=...
TEAMS_APP_PASSWORD=...

# HaveIBeenPwned
HIBP_API_KEY=...

# Twilio (Smishing simulations)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...

# Email (Phish simulation sending domain)
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
PHISH_FROM_DOMAIN=mail.defenddaily.com

# Canarytokens
CANARY_WEBHOOK_BASE=https://api.defenddaily.com/webhooks/canary

# Tracking
TRACKING_BASE_URL=https://click.defenddaily.com

# Auth (Dashboard)
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Okta (Enterprise)
OKTA_DOMAIN=...
OKTA_API_TOKEN=...
OKTA_RISK_POLICY_GROUP_ID=...

# SendGrid (Transactional email)
SENDGRID_API_KEY=...
SENDGRID_FROM_EMAIL=alerts@defenddaily.com

# AWS S3 / Cloudflare R2 (File storage)
S3_BUCKET=...
S3_REGION=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
```

Then create local `.env` from the template (already in .gitignore):
```bash
cp .env.example .env
# Fill in SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_CLIENT_ID, SLACK_CLIENT_SECRET
# DATABASE_URL and REDIS_URL are already correct for local docker
```

**Verify:** `docker compose -f infra/docker-compose.yml ps` shows postgres + redis as healthy.

**Commit:**
```bash
git add infra/docker-compose.yml .env.example
git commit -m "chore: add docker-compose for local Postgres+Redis and env template"
```

**Update PROGRESS.md:** Check off 1.03 and 1.04. Set Last Completed to "1.04 — .env.example".
