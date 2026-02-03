# Call Center Training V2 - Scenario-Based Training System

## TL;DR

> **Quick Summary**: Build a scenario-based call center training system where admins create reusable scenarios (with persona presets), link them to trainings, and generate shareable links. Authenticated users join and practice with an AI voice bot.
> 
> **Deliverables**:
> - New Scenario model with persona presets (rude/chill/unexpected)
> - Scenario CRUD API + UI in Scenario Configuration page
> - Training creation with Scenario selection
> - Shareable training link (requires login)
> - 1-on-1 voice call with AI bot per user
> - Session recording (audio + transcript)
> 
> **Estimated Effort**: Large (15-20 tasks)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Schema → Scenario API → Training Updates → Integration

---

## Context

### Original Request
User wants trainings tab to:
1. Create training with linked scenario (from Scenario Configuration)
2. Generate shareable link
3. Anyone with link joins live call with AI bot
4. Bot tests them through call center scenario

### Interview Summary
**Key Discussions**:
- Scenario is SEPARATE entity from existing Persona model
- Persona becomes a PRESET/SELECTOR within Scenario (rude, chill, unexpected)
- Users MUST login to access training links (no anonymous)
- Each user gets their own room (1-on-1 with bot)
- Record all sessions (audio + transcript)
- Links never expire
- Use TDD approach

**Research Findings**:
- Existing Persona model: name, traits, sourceDocumentId - different from Scenario concept
- Training.config already stores persona settings (temperament, complexity, expertise)
- LiveKit agent exists at `apps/agent/src/entrypoint.ts`
- Session creation at `apps/http/src/routes/sessions.ts` already handles room creation + recording
- Token generation at `apps/fe/src/app/api/tokens/livekit/route.ts`

### Metis Review
**Identified Gaps** (addressed):
- Anonymous user handling → User must login (confirmed)
- Scenario vs Persona confusion → Scenario is main entity, persona is preset within
- Concurrent access → Each user gets own room

---

## Work Objectives

### Core Objective
Enable admins to create reusable scenarios with persona presets, link them to trainings, and let authenticated users practice call center skills with an AI bot via shareable links.

### Concrete Deliverables
- `Scenario` model in Prisma schema
- `ScenarioPersonaPreset` enum (RUDE, CHILL, UNEXPECTED, NEUTRAL, DEMANDING)
- Scenario CRUD API endpoints
- Updated Scenario Configuration UI
- Training.scenarioId FK
- Training.shareToken field
- Updated Training creation form with scenario selector
- `/train/[token]` page for shareable link access
- Session recording integration

### Definition of Done
- [x] `vitest run --filter scenario` → All tests pass
- [x] Create scenario via UI → Visible in list
- [x] Create training with scenario → shareToken generated
- [x] Access `/train/{token}` while logged in → Joins voice call
- [x] Complete session → Recording URL + transcript saved

### Must Have
- Scenario CRUD with persona preset selector
- Training links to exactly one Scenario
- Share token auto-generated on training creation
- Session recording enabled by default
- 1-on-1 rooms per user

### Must NOT Have (Guardrails)
- NO anonymous/guest access
- NO changes to existing Persona model behavior
- NO multi-user shared rooms
- NO link expiration logic
- NO custom recording player UI (use existing)
- NO changes to agent LLM core logic
- NO video support (audio only)

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (vitest configured)
- **User wants tests**: TDD
- **Framework**: vitest

### TDD Workflow
Each TODO follows RED-GREEN-REFACTOR:
1. **RED**: Write failing test first
2. **GREEN**: Implement minimum code to pass
3. **REFACTOR**: Clean up while keeping green

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Scenario Schema + Migration
└── Task 2: ScenarioPersonaPreset enum + types

Wave 2 (After Wave 1):
├── Task 3: Scenario CRUD API (backend)
├── Task 4: Scenario CRUD Tests
└── Task 5: Training.scenarioId + shareToken migration

Wave 3 (After Wave 2):
├── Task 6: Scenario Configuration UI update
├── Task 7: Training API updates
└── Task 8: Training creation form update

Wave 4 (After Wave 3):
├── Task 9: /train/[token] page
├── Task 10: Session creation with scenario data
└── Task 11: Agent metadata integration

Wave 5 (Final):
└── Task 12: E2E flow verification
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3,4,5,6 | 2 |
| 2 | None | 3,6 | 1 |
| 3 | 1,2 | 6,7 | 4,5 |
| 4 | 1,2 | None | 3,5 |
| 5 | 1 | 7,8,9 | 3,4 |
| 6 | 1,2,3 | 9 | 7,8 |
| 7 | 3,5 | 9,10 | 6,8 |
| 8 | 5 | 9 | 6,7 |
| 9 | 6,7,8 | 10,11 | None |
| 10 | 7,9 | 12 | 11 |
| 11 | 10 | 12 | None |
| 12 | All | None | None |

---

## TODOs

### Task 1: Scenario Schema + Migration

**What to do**:
- Add Scenario model to `packages/db/prisma/schema.prisma`
- Include fields: id, organizationId, name, description, personaPreset, temperament, expertise, complexity, documents relation, createdAt, updatedAt
- Create Prisma migration

**Must NOT do**:
- Modify existing Persona model
- Remove any existing fields

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: []
  - No special skills needed - simple schema work

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Task 2)
- **Blocks**: Tasks 3, 4, 5, 6
- **Blocked By**: None

**References**:
- `packages/db/prisma/schema.prisma:124-141` - Training model pattern to follow
- `packages/db/prisma/schema.prisma:255-274` - Existing Persona model (do NOT modify)

**Acceptance Criteria**:
```bash
# After migration
cd packages/db && pnpm prisma migrate dev --name add-scenario-model
# Assert: Migration completes without error

pnpm prisma generate
# Assert: Generates client with Scenario model

# Verify schema
bun -e "import { PrismaClient } from '@prisma/client'; const p = new PrismaClient(); console.log(Object.keys(p).includes('scenario'))"
# Assert: Output is "true"
```

**Commit**: YES
- Message: `feat(db): add Scenario model with persona presets`
- Files: `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/*`

---

### Task 2: ScenarioPersonaPreset enum + types

**What to do**:
- Add `ScenarioPersonaPreset` enum to Prisma schema (RUDE, CHILL, UNEXPECTED, NEUTRAL, DEMANDING)
- Export types in `packages/types/src/index.ts`

**Must NOT do**:
- Create types that conflict with existing Persona types

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: []

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1 (with Task 1)
- **Blocks**: Tasks 3, 6
- **Blocked By**: None

**References**:
- `packages/db/prisma/schema.prisma:192-201` - Existing enum patterns (SessionStatus, TrainingMode)
- `packages/types/src/index.ts` - Type export patterns

**Acceptance Criteria**:
```bash
# Verify enum in schema
grep -c "ScenarioPersonaPreset" packages/db/prisma/schema.prisma
# Assert: >= 1

# Verify type export
bun -e "import { ScenarioPersonaPreset } from '@sales-training/types'; console.log(typeof ScenarioPersonaPreset)"
# Assert: No import error
```

**Commit**: YES (groups with Task 1)
- Message: `feat(db): add Scenario model with persona presets`

---

### Task 3: Scenario CRUD API

**What to do**:
- Create `apps/http/src/routes/scenarios.ts`
- Implement: GET /api/scenarios, GET /api/scenarios/:id, POST /api/scenarios, PUT /api/scenarios/:id, DELETE /api/scenarios/:id
- Add auth middleware (admin/owner only for create/update/delete)
- Register routes in main app

**Must NOT do**:
- Allow public access to scenario endpoints
- Modify training routes in this task

**Recommended Agent Profile**:
- **Category**: `unspecified-low`
- **Skills**: []

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Tasks 4, 5)
- **Blocks**: Tasks 6, 7
- **Blocked By**: Tasks 1, 2

**References**:
- `apps/http/src/routes/trainings.ts` - Follow exact same patterns for CRUD
- `apps/http/src/auth.ts:22-48` - Admin role check pattern
- `apps/http/src/index.ts` - Route registration pattern

**Acceptance Criteria**:
```bash
# Start server, then test (requires auth token from login)
# List scenarios (empty)
curl -s http://localhost:4000/api/scenarios -H "Cookie: $AUTH_COOKIE" | jq 'length'
# Assert: 0

# Create scenario
curl -s -X POST http://localhost:4000/api/scenarios \
  -H "Cookie: $AUTH_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"name":"Angry Customer","description":"Hostile caller","personaPreset":"RUDE","temperament":"aggressive","expertise":"beginner","complexity":"high"}' \
  | jq '.id'
# Assert: Returns non-null cuid

# Verify list
curl -s http://localhost:4000/api/scenarios -H "Cookie: $AUTH_COOKIE" | jq 'length'
# Assert: 1
```

**Commit**: YES
- Message: `feat(api): add Scenario CRUD endpoints`
- Files: `apps/http/src/routes/scenarios.ts`, `apps/http/src/index.ts`

---

### Task 4: Scenario CRUD Tests

**What to do**:
- Create `apps/http/src/routes/scenarios.test.ts`
- Test all CRUD operations
- Test auth requirements (admin only)
- Test validation (required fields)

**Must NOT do**:
- Skip auth tests
- Use real database (use mocks)

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: []

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Tasks 3, 5)
- **Blocks**: None (but should complete before Task 6 starts)
- **Blocked By**: Tasks 1, 2

**References**:
- `apps/http/src/routes/trainings.test.ts` - If exists, follow pattern
- `vitest.config.ts` - Test configuration

**Acceptance Criteria**:
```bash
cd apps/http && pnpm test --filter scenarios
# Assert: All tests pass
# Assert: Coverage for CRUD operations
```

**Commit**: YES
- Message: `test(api): add Scenario CRUD tests`
- Files: `apps/http/src/routes/scenarios.test.ts`

---

### Task 5: Training.scenarioId + shareToken Migration

**What to do**:
- Add `scenarioId` FK to Training model (nullable for existing trainings)
- Add `shareToken` field (unique, auto-generated UUID)
- Create migration
- Add index on shareToken for fast lookups

**Must NOT do**:
- Make scenarioId required (breaks existing data)
- Remove systemPrompt field (backward compat)

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: []

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 2 (with Tasks 3, 4)
- **Blocks**: Tasks 7, 8, 9
- **Blocked By**: Task 1

**References**:
- `packages/db/prisma/schema.prisma:124-141` - Training model to modify
- `packages/db/prisma/schema.prisma:164-190` - TrainingSession pattern (has optional relations)

**Acceptance Criteria**:
```bash
cd packages/db && pnpm prisma migrate dev --name add-training-scenario-link
# Assert: Migration completes

# Verify fields
bun -e "import { PrismaClient } from '@prisma/client'; const p = new PrismaClient(); const t = await p.training.findFirst(); console.log('scenarioId' in (t || {}))"
# Assert: true (or if no trainings, verify schema)
```

**Commit**: YES
- Message: `feat(db): add scenarioId and shareToken to Training`
- Files: `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/*`

---

### Task 6: Scenario Configuration UI Update

**What to do**:
- Refactor `/scenario-configuration` page to manage Scenarios (not Training.config)
- Add Scenario create/edit form
- Add persona preset selector (dropdown: RUDE, CHILL, etc.)
- Keep document upload functionality
- List all scenarios in sidebar

**Must NOT do**:
- Remove existing functionality abruptly
- Change Training directly from this page

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
- **Skills**: `["frontend-ui-ux", "shadcn-ui"]`
  - `frontend-ui-ux`: Complex form UI with multiple inputs
  - `shadcn-ui`: Uses existing component library

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3 (with Tasks 7, 8)
- **Blocks**: Task 9
- **Blocked By**: Tasks 1, 2, 3

**References**:
- `apps/fe/src/app/(dashboard)/scenario-configuration/page.tsx` - Current page to refactor
- `apps/fe/src/app/(dashboard)/trainings/page.tsx:201-268` - CRUD dialog patterns
- `apps/fe/src/components/ui/select.tsx` - Select component for persona preset

**Acceptance Criteria**:
```
# Playwright verification:
1. Navigate to: http://localhost:3000/scenario-configuration
2. Click: "New Scenario" button
3. Fill: name = "Test Scenario"
4. Select: personaPreset = "RUDE"
5. Click: "Create Scenario"
6. Assert: New scenario appears in list
7. Screenshot: .sisyphus/evidence/task-6-scenario-created.png
```

**Commit**: YES
- Message: `feat(ui): refactor scenario configuration to manage Scenarios`
- Files: `apps/fe/src/app/(dashboard)/scenario-configuration/page.tsx`

---

### Task 7: Training API Updates

**What to do**:
- Modify POST /api/trainings to accept `scenarioId`
- Auto-generate `shareToken` (crypto.randomUUID) on create
- Modify GET /api/trainings to include scenario details
- Add GET /api/trainings/by-token/:token for link resolution

**Must NOT do**:
- Make scenarioId required (allow trainings without scenario)
- Remove existing fields (backward compat)

**Recommended Agent Profile**:
- **Category**: `unspecified-low`
- **Skills**: []

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3 (with Tasks 6, 8)
- **Blocks**: Tasks 9, 10
- **Blocked By**: Tasks 3, 5

**References**:
- `apps/http/src/routes/trainings.ts` - File to modify
- `apps/http/src/routes/sessions.ts:80-120` - Room creation pattern with metadata

**Acceptance Criteria**:
```bash
# Create training with scenario
curl -s -X POST http://localhost:4000/api/trainings \
  -H "Cookie: $AUTH_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Training","description":"Desc","systemPrompt":"Prompt","scenarioId":"<scenario_id>"}' \
  | jq '.shareToken'
# Assert: Returns UUID-format string

# Resolve by token
curl -s http://localhost:4000/api/trainings/by-token/<token> \
  -H "Cookie: $AUTH_COOKIE" \
  | jq '.id'
# Assert: Returns training id
```

**Commit**: YES
- Message: `feat(api): add scenarioId and shareToken to training endpoints`
- Files: `apps/http/src/routes/trainings.ts`

---

### Task 8: Training Creation Form Update

**What to do**:
- Modify training creation dialog to include Scenario selector
- Fetch scenarios from API and display in dropdown
- Show scenario details when selected
- Keep existing fields (name, description, systemPrompt)

**Must NOT do**:
- Remove ability to create training without scenario
- Remove systemPrompt field (still editable)

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
- **Skills**: `["frontend-ui-ux", "shadcn-ui"]`

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3 (with Tasks 6, 7)
- **Blocks**: Task 9
- **Blocked By**: Task 5

**References**:
- `apps/fe/src/app/(dashboard)/trainings/page.tsx:211-267` - Current creation form
- `apps/fe/src/app/(dashboard)/scenario-configuration/page.tsx:302-320` - Scenario dropdown pattern

**Acceptance Criteria**:
```
# Playwright verification:
1. Navigate to: http://localhost:3000/trainings
2. Click: "New Training" button
3. Assert: Scenario dropdown is visible
4. Select: Scenario from dropdown
5. Fill: name, description
6. Click: "Create Training"
7. Assert: Training created with shareToken visible
8. Screenshot: .sisyphus/evidence/task-8-training-with-scenario.png
```

**Commit**: YES
- Message: `feat(ui): add scenario selector to training creation`
- Files: `apps/fe/src/app/(dashboard)/trainings/page.tsx`

---

### Task 9: /train/[token] Page

**What to do**:
- Create `apps/fe/src/app/train/[token]/page.tsx`
- Resolve token to training via API
- Require authentication (redirect to login if not)
- Show training/scenario details
- "Start Training" button to initiate session
- After session start, show LiveKit room UI

**Must NOT do**:
- Allow unauthenticated access
- Create new session flow (reuse existing)

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
- **Skills**: `["frontend-ui-ux"]`

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 4 (Sequential)
- **Blocks**: Tasks 10, 11
- **Blocked By**: Tasks 6, 7, 8

**References**:
- `apps/fe/src/app/(dashboard)/active-training/page.tsx` - LiveKit room integration pattern
- `apps/fe/src/app/(dashboard)/employee/session/[sessionId]/page.tsx` - Session page pattern
- `apps/fe/src/middleware.ts` - Auth redirect pattern

**Acceptance Criteria**:
```
# Playwright verification:
1. Navigate to: http://localhost:3000/train/<token> (while logged in)
2. Assert: Training name displayed
3. Assert: Scenario name displayed
4. Assert: "Start Training" button visible
5. Click: "Start Training"
6. Assert: LiveKit room connects (audio controls visible)
7. Screenshot: .sisyphus/evidence/task-9-training-room.png

# Unauthenticated test:
1. Clear cookies
2. Navigate to: http://localhost:3000/train/<token>
3. Assert: Redirected to /login
```

**Commit**: YES
- Message: `feat(ui): add shareable training page /train/[token]`
- Files: `apps/fe/src/app/train/[token]/page.tsx`

---

### Task 10: Session Creation with Scenario Data

**What to do**:
- Modify session creation to read scenario data from training
- Pass scenario details (personaPreset, temperament, etc.) in room metadata
- Ensure recording is enabled

**Must NOT do**:
- Break existing session creation flow
- Remove existing metadata fields

**Recommended Agent Profile**:
- **Category**: `unspecified-low`
- **Skills**: []

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 4 (with Task 11)
- **Blocks**: Task 12
- **Blocked By**: Tasks 7, 9

**References**:
- `apps/http/src/routes/sessions.ts:80-185` - Session creation with room metadata
- `apps/http/src/routes/sessions.ts:139-165` - Recording configuration

**Acceptance Criteria**:
```bash
# Create session with scenario training
curl -s -X POST http://localhost:4000/api/sessions \
  -H "Cookie: $AUTH_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"trainingId":"<training_with_scenario>"}' \
  | jq '.roomName'
# Assert: Returns room name

# Verify room metadata includes scenario
# (Need to check LiveKit room or agent logs)
```

**Commit**: YES
- Message: `feat(api): pass scenario data in session room metadata`
- Files: `apps/http/src/routes/sessions.ts`

---

### Task 11: Agent Metadata Integration

**What to do**:
- Modify agent to read scenario metadata from room
- Use personaPreset to adjust LLM system prompt
- Use temperament/complexity for call behavior
- Log scenario info for debugging

**Must NOT do**:
- Change core agent architecture
- Remove existing metadata handling

**Recommended Agent Profile**:
- **Category**: `unspecified-low`
- **Skills**: []

**Parallelization**:
- **Can Run In Parallel**: YES (after Task 10 starts)
- **Parallel Group**: Wave 4 (with Task 10)
- **Blocks**: Task 12
- **Blocked By**: Task 10

**References**:
- `apps/agent/src/entrypoint.ts:63-70` - Metadata parsing
- `apps/agent/src/entrypoint.ts:148-206` - System prompt construction

**Acceptance Criteria**:
```bash
# Start agent, join training session, check logs
# Assert: Logs show "personaPreset: RUDE" (or selected preset)
# Assert: Agent speaks with appropriate tone
```

**Commit**: YES
- Message: `feat(agent): integrate scenario persona presets`
- Files: `apps/agent/src/entrypoint.ts`

---

### Task 12: E2E Flow Verification

**What to do**:
- Create Playwright E2E test for full flow
- Test: Create scenario → Create training → Copy link → Join → Start call → End → Verify recording

**Must NOT do**:
- Skip any step in the flow
- Use mocked APIs (test against real backend)

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: `["playwright"]`
  - `playwright`: E2E browser automation

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 5 (Final)
- **Blocks**: None
- **Blocked By**: All previous tasks

**References**:
- `apps/fe/e2e/example.spec.ts` - Existing E2E test patterns
- Playwright config in `apps/fe`

**Acceptance Criteria**:
```bash
cd apps/fe && pnpm test:e2e --grep "call center training flow"
# Assert: Test passes

# Test should verify:
# 1. Create scenario with RUDE preset
# 2. Create training linked to scenario
# 3. Copy share link
# 4. Open link in new context
# 5. Start training
# 6. Verify audio connection
# 7. End session
# 8. Verify recording status is COMPLETED
```

**Commit**: YES
- Message: `test(e2e): add call center training flow test`
- Files: `apps/fe/e2e/call-center-training.spec.ts`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1+2 | `feat(db): add Scenario model with persona presets` | schema.prisma, migrations, types | prisma generate |
| 3 | `feat(api): add Scenario CRUD endpoints` | scenarios.ts, index.ts | curl tests |
| 4 | `test(api): add Scenario CRUD tests` | scenarios.test.ts | vitest |
| 5 | `feat(db): add scenarioId and shareToken to Training` | schema.prisma, migrations | prisma generate |
| 6 | `feat(ui): refactor scenario configuration` | scenario-configuration/page.tsx | manual verify |
| 7 | `feat(api): add scenarioId and shareToken to trainings` | trainings.ts | curl tests |
| 8 | `feat(ui): add scenario selector to training creation` | trainings/page.tsx | manual verify |
| 9 | `feat(ui): add shareable training page` | train/[token]/page.tsx | playwright |
| 10 | `feat(api): pass scenario data in session metadata` | sessions.ts | curl + logs |
| 11 | `feat(agent): integrate scenario persona presets` | entrypoint.ts | logs |
| 12 | `test(e2e): add call center training flow test` | call-center-training.spec.ts | pnpm test:e2e |

---

## Success Criteria

### Verification Commands
```bash
# All tests pass
pnpm test

# E2E passes
cd apps/fe && pnpm test:e2e --grep "call center"

# Manual flow works
# 1. Login as admin
# 2. Create scenario in Scenario Configuration
# 3. Create training with that scenario
# 4. Copy share link
# 5. Open link (logged in) → Join call → Talk with bot → End
# 6. Check session has recording
```

### Final Checklist
- [x] Scenario model exists with persona presets
- [x] Scenarios manageable via UI
- [x] Training links to Scenario
- [x] Share token auto-generated
- [x] /train/[token] page works (authenticated)
- [x] Voice call with AI bot works
- [x] Session recording saved
- [x] All tests pass
