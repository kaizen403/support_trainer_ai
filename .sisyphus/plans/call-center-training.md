# Call Center Training AI (Single‑Company)

## TL;DR

> **Quick Summary**: Extend the existing training system into a Call Center Training AI with dual modes (Simulation + Guided Interview), org‑wide document/persona library, stable voice handling, new scoring metrics, and five dashboard modules with audio+transcript replay.
>
> **Deliverables**:
> - Schema/type extensions for modes, personas, skills, coaching notes, replay metadata
> - Document ingestion for PDF/TXT/DOCX/MD + persona extraction + RAG freshness
> - Dual‑mode agent logic with auto persona selection
> - New scoring metrics + coaching report citing uploaded materials
> - Five dashboard modules (Command Center, Scenario Config, Active Training, Analytics, Team Management)
> - Audio recording + synced transcript replay
>
> **Estimated Effort**: XL
> **Parallel Execution**: YES – 3 waves
> **Critical Path**: Schema/Types → API + Agent + Assessment → UI + Replay

---

## Context

### Original Request
Refactor/extend an existing AI Interviewer into a Sales & Customer Support Training AI, reusing voice/PDF patterns from a read‑only reference project. Build dual training modes, dynamic personas from uploaded documents, new scoring metrics, and five dashboard modules with full functionality.

### Interview Summary
**Key Discussions**:
- Reference location **read‑only**: `AI_Interviewer_vitap/` (voice + PDF/PPT + interview flow).
- Implementation: Turbo monorepo **apps + packages** (`apps/fe`, `apps/http`, `apps/agent`, `packages/*`).
- **Single‑company** only (no multi‑tenant); keep Org schema as default single org.
- Persona/doc library is **org‑wide** and **auto‑selected**.
- Doc formats: **PDF/TXT/DOCX/MD**.
- Replay: **audio + transcript** via LiveKit egress.
- Access: **all members can view roster + analytics**; **admin‑only** for training/doc CRUD.
- Scoring: **clarity, protocol adherence, empathy, conversion potential** with **equal‑weight overall score**.
- Test strategy: **TDD**. New libs allowed.

**Research Findings (repo patterns)**:
- Training backend exists in `apps/http/src/routes/{trainings,documents,sessions}.ts`.
- Agent runtime exists in `apps/agent/src/entrypoint.ts` (LiveKit STT/TTS).
- Assessment & RAG exist in `packages/ai/src/{assessment,rag}.ts`.
- FE layout/nav in `apps/fe/src/components/layout/sidebar.tsx` and routes under `apps/fe/src/app/(dashboard)`.
- No charting library or replay pipeline currently exists.

### Metis Review (Resolved Defaults)
- **Retention**: retain indefinitely with admin delete (no auto retention job).
- **RAG freshness**: synchronous indexing with visible status; block sessions until indexed.
- **Persona mutability**: editable; store personaSnapshot per session.
- **Replay sync**: segment‑level timestamps (no word‑level requirement).
- **Replay fallback**: transcript‑only if egress unavailable.

---

## Work Objectives

### Core Objective
Deliver a stable, voice‑first call center training system with dual modes, dynamic personas, actionable analytics, and audio+transcript replay — without touching reference code or introducing multi‑tenant complexity.

### Concrete Deliverables
- Schema updates for training mode/persona/skills/coaching/recording metadata
- Org‑wide document library with DOCX/MD ingestion + persona extraction
- Dual‑mode agent prompts + auto persona selection
- New assessment metrics + coaching report citing source docs
- Five dashboard modules with full navigation
- LiveKit egress recording + replay endpoint

### Definition of Done
- [x] Uploads influence AI behavior in **≤30s** and are reflected in retrieval/prompting
- [x] Voice interruptions behave comparably to reference patterns
- [x] Coaching report cites specific uploaded materials
- [x] All five sections functional (no placeholders)
- [x] No files under `AI_Interviewer_vitap/` modified

### Must Have
- Dual modes (Simulation + Guided Interview)
- Org‑wide documents/personas (auto selection)
- New metrics with equal‑weight overall score
- Audio+transcript replay

### Must NOT Have (Guardrails)
- No multi‑tenant/org switching UI
- No reference edits in `AI_Interviewer_vitap/`
- No OCR/image parsing
- No manual‑only verification steps

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES
- **User wants tests**: **TDD**
- **Frameworks**: Vitest (backend/packages), Playwright (FE E2E)

### TDD Workflow
Each task follows RED‑GREEN‑REFACTOR with automated checks only.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Schema + Types
└── Task 7: Sidebar + Module Routing Shell

Wave 2 (After Wave 1):
├── Task 2: Document ingestion + persona extraction
├── Task 3: Agent dual‑mode + persona selection
├── Task 4: Assessment metrics + coaching report
└── Task 5: Backend APIs for config, personas, assignments, replay

Wave 3 (After Wave 2):
├── Task 6: LiveKit egress recording + replay pipeline
├── Task 8: Scenario Config + Command Center UI
├── Task 9: Active Training Interface UI
└── Task 10: Analytics + Team Management UI
```

---

## TODOs

> Implementation + tests are combined in each task.

### 1) Extend Schema + Types for Modes, Personas, Replay

**What to do**:
- Update Prisma schema for Training, KnowledgeDocument, TrainingSession, Assessment.
- Add Persona model + Assignment (member ↔ training) model.
- Extend shared types in `packages/types`.

**References**:
- `packages/db/prisma/schema.prisma`
- `packages/types/src/index.ts`

**Acceptance Criteria**:
- [x] `pnpm -C packages/db prisma validate` → PASS
- [x] `pnpm -C packages/types test` → PASS

**Commit & Push**:
- Commit: `feat(db): extend training schema for personas/replay`
- Push: `git push` (current branch, no force)

---

### 2) Expand Document Ingestion + Persona Extraction

**What to do**:
- Add DOCX + MD parsing.
- Classify doc type (product/persona/script/objections).
- Extract personas from persona docs; store in Persona model.
- Expose ingestion status (indexed/processing/failed).

**References**:
- `apps/http/src/routes/documents.ts`
- `packages/ai/src/rag.ts`

**Acceptance Criteria**:
- [x] `pnpm -C apps/http test` → PASS
- [x] Upload DOCX/MD returns `{ status: "indexed" }`

**Commit & Push**:
- Commit: `feat(api): add docx/md ingestion and persona extraction`
- Push: `git push`

---

### 3) Dual‑Mode Agent Logic + Auto Persona Selection

**What to do**:
- Add Simulation vs Guided Interview routing.
- Auto‑select persona from library; store personaSnapshot per session.
- Tag transcripts with technique outcomes for UI color coding.

**References**:
- `apps/agent/src/entrypoint.ts`
- `packages/ai/src/conversation.ts`
- `AI_Interviewer_vitap/apps/backend/src/agent/project-review/*`

**Acceptance Criteria**:
- [x] Unit tests for prompt builder (mode + persona)
- [x] `pnpm -C packages/ai test` → PASS

**Commit & Push**:
- Commit: `feat(agent): add dual-mode flows and persona selection`
- Push: `git push`

---

### 4) Assessment Metrics + Coaching Report w/ Citations

**What to do**:
- Add new metrics to assessment schema and equal‑weight overall score.
- Generate coaching report citing source document chunks.
- Persist and return via sessions API.

**References**:
- `packages/ai/src/assessment.ts`
- `apps/http/src/routes/sessions.ts`

**Acceptance Criteria**:
- [x] `pnpm -C packages/ai test` → PASS
- [x] `curl -s http://localhost:PORT/api/sessions/{id}/assessment | jq '.metrics.clarity'` succeeds

**Commit & Push**:
- Commit: `feat(assessment): add new metrics and coaching report`
- Push: `git push`

---

### 5) Backend APIs for Config, Personas, Assignments, Replay

**What to do**:
- Routes for persona library, scenario config, assignments, replay metadata, coaching hints.

**References**:
- `apps/http/src/routes/trainings.ts`
- `apps/http/src/routes/sessions.ts`

**Acceptance Criteria**:
- [x] `pnpm -C apps/http test` → PASS
- [x] `curl -s http://localhost:PORT/api/personas | jq 'length>=0'`

**Commit & Push**:
- Commit: `feat(api): add personas/config/assignment/replay endpoints`
- Push: `git push`

---

### 6) LiveKit Egress Recording + Replay Pipeline

**What to do**:
- Start/stop egress recording on session lifecycle.
- Persist recording URL + status on TrainingSession.
- Fallback to transcript‑only if egress fails.

**References**:
- `apps/http/src/routes/sessions.ts`
- LiveKit egress docs

**Acceptance Criteria**:
- [x] `curl -s http://localhost:PORT/api/sessions/{id}/replay | jq '.audioUrl,.transcript'`

**Commit & Push**:
- Commit: `feat(replay): add livekit egress recording and replay`
- Push: `git push`

---

### 7) Sidebar + Module Routing Shell

**What to do**:
- Add sidebar nav items for 5 modules.
- Add route shells in `/app/(dashboard)/...`.

**References**:
- `apps/fe/src/components/layout/sidebar.tsx`
- `apps/fe/src/app/(dashboard)/layout.tsx`

**Acceptance Criteria**:
- [x] Playwright test ensures nav items exist
- [x] `pnpm -C apps/fe test:e2e` → PASS

**Commit & Push**:
- Commit: `feat(fe): add dashboard routing shells`
- Push: `git push`

---

### 8) Scenario Configuration + Command Center UI

**What to do**:
- Scenario Config: doc upload, controls for temperament/expertise/complexity.
- Command Center: live status, quick‑start, recent history/trend.

**References**:
- `apps/fe/src/app/(dashboard)/trainings/[id]/page.tsx`
- `apps/fe/src/app/(dashboard)/admin/analytics/page.tsx`

**Acceptance Criteria**:
- [x] E2E: pages load and show required headings
- [x] `pnpm -C apps/fe test:e2e` → PASS

**Commit & Push**:
- Commit: `feat(fe): add command center and scenario config`
- Push: `git push`

---

### 9) Active Training Interface UI

**What to do**:
- Split view conversation + coaching panel.
- Color‑coded transcript entries.
- Voice visualizer using AudioContext pattern.
- Floating assistance widget with pause/guidance request.

**References**:
- `apps/fe/src/app/(dashboard)/employee/session/[sessionId]/page.tsx`
- `apps/fe/src/app/(dashboard)/employee/session/[sessionId]/prepare/page.tsx`

**Acceptance Criteria**:
- [x] E2E: split view and tags render
- [x] `pnpm -C apps/fe test:e2e` → PASS

**Commit & Push**:
- Commit: `feat(fe): add active training interface`
- Push: `git push`

---

### 10) Performance Analytics + Team Management UI

**What to do**:
- Radar chart with Recharts + accessible summary.
- Replay view with audio + synced transcript.
- Roster with skill progression + assignments.

**References**:
- `apps/fe/src/app/(dashboard)/admin/analytics/page.tsx`
- `apps/fe/src/app/(dashboard)/settings/team/page.tsx`

**Acceptance Criteria**:
- [x] E2E: radar chart container + replay controls exist
- [x] `pnpm -C apps/fe test:e2e` → PASS

**Commit & Push**:
- Commit: `feat(fe): add analytics and team management views`
- Push: `git push`

---

## Commit Strategy (User Requirement)

- **After every feature task**, create a commit and **push to the current branch**.
- **Never force push**.
- If no remote is configured, **stop and ask** before continuing.

---

## Success Criteria

### Verification Commands
```bash
pnpm -C packages/db prisma validate
pnpm -C packages/types test
pnpm -C packages/ai test
pnpm -C apps/http test
pnpm -C apps/fe test:e2e
```

### Final Checklist
- [x] Dual‑mode training flows functional
- [x] Document uploads affect AI behavior within SLA
- [x] New metrics + coaching report visible
- [x] Replay works with audio + transcript sync
- [x] All five dashboard modules complete
- [x] Reference location untouched
