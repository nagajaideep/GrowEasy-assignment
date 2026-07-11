# GrowEasy — AI-Powered CSV Importer

Import CRM leads from **any** CSV format. Upload a Facebook/Google Ads export, an Excel
sheet, a real-estate CRM dump, or a hand-made spreadsheet — the app uses an LLM to
intelligently map arbitrary columns into the fixed GrowEasy CRM schema, batches the rows,
validates every field, and returns clean structured records.

The hard part isn't parsing CSV. It's handling **unknown column names, layouts, and messy
data** — which is exactly what the AI mapping layer solves here.

---

## Features

- **Any CSV layout** — no fixed column names assumed; the AI maps fields by meaning.
- **Drag & drop upload** with client-side preview before any AI call.
- **Confirm-then-process** flow — nothing hits the AI until you click *Upload File*.
- **Batch processing** — rows are chunked and sent to the model in batches.
- **Retry with backoff** — failed batches retry up to N times; a permanently failed batch
  is reported as skipped instead of aborting the whole import.
- **Streaming progress** — the UI shows live batch/row progress via Server-Sent Events.
- **Strict validation** — enum-locked `crm_status` / `data_source`, `new Date()`-safe
  `created_at`, first email/mobile kept (extras appended to notes), CSV-safe single-line
  values, and rows with no email *and* no mobile are skipped.
- **Virtualized results table** with sticky headers, horizontal + vertical scroll.
- **Dark mode**, responsive layout, CSV export of results.
- **Key-free demo mode** — a deterministic heuristic provider lets the whole app run
  end-to-end with no API keys (great for local dev / reviewers).

---

## Tech Stack

| Layer     | Tech                                        |
| --------- | ------------------------------------------- |
| Frontend  | Next.js 14 (App Router), React 18, Tailwind |
| Backend   | Node.js, Express, TypeScript                |
| AI        | Gemini / OpenAI (pluggable) + mock fallback |
| Parsing   | PapaParse                                   |
| Tests     | Vitest                                      |

---

## Project Structure

```
groweasy-csv-importer/
├── backend/                 # Express + TypeScript API
│   ├── src/
│   │   ├── config/          # env & provider resolution
│   │   ├── prompts/         # the AI extraction prompt (prompt engineering)
│   │   ├── routes/          # /api/import and /api/import/stream
│   │   ├── services/        # extractor (batching/retry) + AI providers
│   │   ├── utils/           # csv, normalize (validation), chunk
│   │   └── tests/           # vitest unit tests
│   └── Dockerfile
├── frontend/                # Next.js app
│   ├── src/
│   │   ├── app/             # layout + page (dashboard shell)
│   │   ├── components/      # ImportModal, VirtualTable, ResultView, ...
│   │   └── lib/             # api client, csv helpers, types
│   └── Dockerfile
├── sample-data/             # example CSVs in different formats
└── docker-compose.yml
```

---

## Getting Started (local)

### Prerequisites
- Node.js 20+

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # optional: add a GEMINI_API_KEY or OPENAI_API_KEY
npm run dev               # http://localhost:4000
```

Without an API key the backend runs in **mock mode** (heuristic mapping) so you can try the
full flow immediately. To use a real model, set one of these in `backend/.env`:

```
GEMINI_API_KEY=your_key        # uses gemini-1.5-flash by default
# or
OPENAI_API_KEY=your_key        # uses gpt-4o-mini by default
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local     # NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
npm run dev                    # http://localhost:3000
```

Open http://localhost:3000, click **Import Leads via CSV**, drop a CSV, preview it, then
**Upload File** to run the AI extraction.

---

## Testing

```bash
cd backend
npm test          # vitest: csv, normalize, extractor (batching + retry)
```

---

## API

Base URL: `http://localhost:4000`

### `GET /api/health`
Returns `{ status, provider, batchSize, maxRetries }`.

### `POST /api/import`
Accepts one of:
- `multipart/form-data` with a `file` field (a CSV),
- `application/json` `{ "csv": "<raw csv string>" }`,
- `application/json` `{ "records": [ { ...rawRow } ] }`.

Returns:

```json
{
  "records": [ /* CrmRecord[] */ ],
  "skipped": [ { "rowNumber": 3, "reason": "no email or mobile", "raw": {} } ],
  "totalImported": 12,
  "totalSkipped": 1,
  "totalRows": 13,
  "provider": "mock:heuristic",
  "batches": 1
}
```

Add `?format=csv` to download the mapped CRM records as CSV.

### `POST /api/import/stream`
Same inputs as `/api/import`, but responds with a `text/event-stream` emitting
`start`, `progress`, `result`, and `error` events so the client can render live progress.

---

## CRM Schema & AI Rules

The AI maps into these fields: `created_at, name, email, country_code,
mobile_without_country_code, company, city, state, country, lead_owner, crm_status,
crm_note, data_source, possession_time, description`.

Enforced rules (validated server-side even if the model drifts):
- `crm_status` ∈ `GOOD_LEAD_FOLLOW_UP | DID_NOT_CONNECT | BAD_LEAD | SALE_DONE` (else blank)
- `data_source` ∈ `leads_on_demand | meridian_tower | eden_park | varah_swamy | sarjapur_plots` (else blank)
- `created_at` must be `new Date()`-parseable (else blank)
- First email/mobile wins; extras are appended to `crm_note`
- Newlines inside values are escaped to `\n` (CSV stays single-row)
- Rows with neither email nor mobile are **skipped**

---

## Docker

```bash
docker compose up --build
# frontend -> http://localhost:3000
# backend  -> http://localhost:4000
```

Pass an API key to the backend via environment:

```bash
GEMINI_API_KEY=your_key docker compose up --build
```

---

## Deployment

- **Frontend (Vercel):** set root to `frontend/`, add env `NEXT_PUBLIC_API_BASE_URL` =
  your deployed backend URL.
- **Backend (Render/Railway):** root `backend/`, build `npm install && npm run build`,
  start `npm start`, set `CORS_ORIGIN` to your frontend URL and add your AI key.

---

## Notes

- Next.js is pinned to `14.2.33` (latest of the 14.x line). npm may print a security
  advisory for the 14.x line; upgrading to Next 15 (React 19) is the long-term fix and is
  out of scope for this assignment.
- The mock provider is a pragmatic heuristic, not a real model — set an API key to see the
  full prompt-engineered mapping quality.
