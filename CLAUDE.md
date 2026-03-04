# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Vite)
npm run build        # TypeScript compile + Vite build
npm run typecheck    # Type-check only (no emit)
npm run lint         # ESLint
npm run preview      # Preview production build locally
```

No test suite is configured. Use `typecheck` and `lint` to validate changes.

## Environment

Requires a `.env.local` (or env vars) with:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Architecture

**Stack:** React 18 + TypeScript + Vite + Tailwind CSS + Supabase (`@supabase/supabase-js`)

### Views (App.tsx)
Single-page app with five views controlled by a `View` type (`'import' | 'team' | 'list' | 'detail' | 'ops'`). Navigation is tab-based; `ops` is only shown to `admin` role users.

### Role system
`useRole()` reads `session.user.app_metadata.role` from Supabase auth. Two roles: `'admin'` and `'team'`. Role assignment happens server-side via Supabase auth metadata — there's no UI to change it.

### Data flow
- **CSVImport** (`src/components/CSVImport.tsx`): Accepts 13 CSV files exported from the Soul platform (profiles, athletes, companies, achievements, activations, causes, education, media, partners, ranking, results, social actions, user roles). Parses and computes completion scores, then upserts into Supabase tables `users` and `onboarding`.
- **Scoring logic** lives in `src/lib/csvValidation.ts`: separate functions for athlete vs. company profiles. Athletes use a 3-layer system (must-base fields, must-cards, nice-to-have) plus a commercial score (P1–P5 pillars → tier label). Companies use a simpler point tally.
- **`src/lib/csvParser.ts`**: PapaParse wrappers and field extraction helpers used by both CSVImport and csvValidation.

### Supabase schema (key tables)
| Table | Purpose |
|---|---|
| `users` | Core user records (user_id, email, full_name) |
| `onboarding` | Per-user completion records with `profile_kind` ('athlete'/'partner'), `completion_score`, `completion_status`, `missing_fields` (JSONB) |
| `outreach` | Manual outreach log entries per user |
| `ops_metrics` | Monthly operational KPIs (finances, funnels, marketing) — admin-only |
| `ops_investors` | Investor list for report distribution — admin-only |

RLS policies: team members can read all data; only `admin` role can write to ops tables. Migrations are in `supabase/migrations/`.

### Hooks
- `useAuth` — Supabase session + signOut
- `useRole` — derives `'admin' | 'team'` from session metadata
- `useOnboarding` — filterable fetch of `onboarding` table
- `useUserData` — fetches `users` + `onboarding` + `outreach` for a single userId

### Supabase Edge Function
`supabase/functions/generate-report/` — generates investor report (called from OpsDashboard).

### Completion status thresholds
`CompletionStatus` type: `'stalled' | 'incomplete' | 'almost' | 'acceptable' | 'complete'`

Athlete thresholds (from csvValidation): `stalled` (score=0), `incomplete` (<40), `almost` (<70), `acceptable` (<100), `complete` (=100). Company uses simpler thresholds (100=complete, ≥80=almost, else incomplete).

## Key constants
- `src/constants/activationIds.ts` — activation type UUIDs used in scoring (e.g., Talk/Mentor, Brand Event IDs)
- `src/lib/utils.tsx` — `isFilled`, `hasValue`, `isEmptyArrayLike`, `pick`, `norm`, `normalizeMissingFields`
