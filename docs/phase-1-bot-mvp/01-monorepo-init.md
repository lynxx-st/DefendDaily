# Steps 1.01–1.02: Monorepo Init + TypeScript Config

## 1.01 Initialize pnpm monorepo

```bash
cd /path/to/DefendDaily
pnpm init
```

Edit root `package.json`:
```json
{
  "name": "defenddaily",
  "private": true,
  "scripts": {
    "dev:api": "pnpm --filter api dev",
    "dev:dashboard": "pnpm --filter dashboard dev",
    "migrate": "pnpm --filter api migrate",
    "seed": "pnpm --filter api seed",
    "test": "pnpm --filter api test"
  }
}
```

Create `pnpm-workspace.yaml`:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

Create directory structure:
```bash
mkdir -p apps/api/src/{config,db/migrations,bots/slack/{commands,actions,messages},bots/teams/cards,jobs,routes,services,middleware}
mkdir -p apps/dashboard
mkdir -p packages/shared-types/src
mkdir -p packages/puzzle-bank/{spot-the-phish,true-false,scenarios}
mkdir -p infra
```

Create `.gitignore`:
```
node_modules/
dist/
.env
*.log
.DS_Store
```

## 1.02 Root TypeScript Config

Create `tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

**Verify:** `cat pnpm-workspace.yaml` should show both `apps/*` and `packages/*`.

**Commit:**
```bash
git init
git add pnpm-workspace.yaml package.json tsconfig.base.json .gitignore
git commit -m "chore: initialize pnpm monorepo with workspace structure"
```

**Update PROGRESS.md:** Check off 1.01 and 1.02. Set Last Completed to "1.02 — tsconfig.base.json".
