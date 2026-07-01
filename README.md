# SQL Analyzer

A developer tool that instantly explains, lints, and scores SQL queries — built to help developers write better, faster SQL.

**Live demo → [sqlanalyzer-ten.vercel.app](https://sqlanalyzer-ten.vercel.app)**

---

## What it does

Paste any SQL query and get back:

- **Plain-English explanation** — what the query actually does, in human language
- **Performance warnings** — anti-patterns like `SELECT *`, missing `WHERE` clauses, subqueries in `WHERE`, leading wildcards, and more
- **Query score** — a 0–100 score summarising overall query quality
- **Severity levels** — warnings vs. informational hints, color-coded

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, React |
| UI | shadcn/ui, Tailwind CSS |
| Editor | Monaco Editor (the same editor as VS Code) |
| Analysis engine | Python 3, sqlglot (AST-based SQL parser) |
| Hosting | Vercel |
| Backend (WIP) | AWS Lambda, API Gateway |
| Database (WIP) | AWS RDS (Postgres) |
| Auth (WIP) | AWS Cognito |
| Package manager | pnpm |

---

## Architecture

```
Browser (Next.js on Vercel)
        │
        ▼
  /api/analyze (Next.js API route)
        │
        ▼
  TypeScript analyzer (lib/analyzer.ts)
  ┌─────────────────────────────────┐
  │  Parser → Explainer → Linter   │
  │  Score calculator               │
  └─────────────────────────────────┘

Planned AWS architecture:
Browser → API Gateway → Lambda (Python + sqlglot) → RDS Postgres
```

---

## Linting rules

| Rule | Severity |
|---|---|
| `SELECT *` | ⚠️ Warning |
| Subquery in `WHERE` (use JOIN instead) | ⚠️ Warning |
| `LIKE '%...'` leading wildcard | ⚠️ Warning |
| `SELECT *` with `JOIN` | ⚠️ Warning |
| Statement after semicolon (syntax error) | ⚠️ Warning |
| Missing `WHERE` clause | ℹ️ Info |
| Missing `LIMIT` clause | ℹ️ Info |
| `HAVING` without pre-filter | ℹ️ Info |

---

## Running locally

**Prerequisites:** Node.js 18+, pnpm, Python 3.10+

```bash
# Clone the repo
git clone https://github.com/liat-kauffman/sql-analyzer.git
cd sql-analyzer

# Frontend
cd frontend
pnpm install
pnpm dev
# → http://localhost:3000

# Backend (optional, for Python-based analysis)
cd ../backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 handler.py
```

---

## Project structure

```
sql-analyzer/
├── frontend/                  # Next.js app
│   ├── app/
│   │   ├── page.tsx           # Main editor + results UI
│   │   └── api/analyze/
│   │       └── route.ts       # API route
│   ├── lib/
│   │   └── analyzer.ts        # TypeScript analysis engine
│   └── components/ui/         # shadcn components
│
├── backend/                   # Python analysis engine
│   ├── handler.py             # Entry point
│   └── analyzer/
│       ├── parser.py          # sqlglot AST parser
│       ├── explainer.py       # AST → plain English
│       └── linter.py          # Anti-pattern detection
│
└── infra/                     # AWS CDK (coming soon)
```

---

## Roadmap

- [x] SQL editor with syntax highlighting
- [x] Plain-English explanation
- [x] Performance linter with severity levels
- [x] Query score (0–100)
- [x] Example queries
- [x] Dark mode
- [x] Deploy to Vercel
- [ ] AWS Lambda backend (Python + sqlglot)
- [ ] Query history (RDS Postgres)
- [ ] User auth (AWS Cognito)
- [ ] Execution plan visualizer
- [ ] S3 export (PDF / JSON)

---

## Author

Built by [Liat Kauffman](https://github.com/liat-kauffman) — junior fullstack developer working with TypeScript, Next.js, React, Python, and AWS.
