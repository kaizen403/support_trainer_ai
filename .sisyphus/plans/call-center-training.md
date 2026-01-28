# Call Center AI Training Platform

## TL;DR

> **Quick Summary**: B2B SaaS where companies create training scenarios and employees practice with AI-powered voice conversations. Full-duplex voice with < 2s latency using **LiveKit + AgentsJS** with Deepgram STT and Eleven Labs TTS.
> 
> **Deliverables**:
> - Multi-tenant auth system (companies + employees)
> - Training scenario CRUD with knowledge base (RAG)
> - Real-time voice training engine (AI customer simulation)
> - Session recording with AI-generated assessments
> - Company admin dashboard + employee training portal
> 
> **Estimated Effort**: XL (6-8 weeks full-time)
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Auth Setup → Database Schema → Training CRUD → Voice Engine → Assessment

---

## Context

### Original Request
Build a B2B SaaS call center training platform where:
- Companies onboard and create custom training scenarios
- Employees login and practice with AI via real-time voice
- AI generates random customer avatars/personas per session
- System provides detailed assessment after each session

### Interview Summary
**Key Discussions**:
- **ORM**: Prisma (with raw SQL for PGVector operations)
- **Billing**: Excluded from scope - focus on core training
- **Deployment**: Render (web services + managed Postgres)
- **Testing**: Vitest (unit/integration) + Playwright (E2E)
- **Conversation Mode**: Full-duplex (interruptible via VAD)
- **Session Duration**: 5-10 minutes max
- **Voice Pipeline**: LiveKit WebRTC + AgentsJS (server-side voice AI)
- **STT Provider**: Deepgram (streaming, low latency)
- **TTS Provider**: Eleven Labs (via LiveKit plugin)
- **Agent Runtime**: Node.js AgentsJS
- **Latency Target**: < 2 seconds response time

**Research Findings**:
- LiveKit Agents: AgentSession handles STT/LLM/TTS pipeline with built-in turn detection
- LiveKit AgentsJS: Node.js SDK with plugins for Deepgram, Eleven Labs, OpenAI
- LangGraph Integration: Use LLMAdapter to wrap LangGraph for reasoning/tools
- Deepgram STTv2: Streaming with interim results, designed for real-time
- Eleven Labs TTS: Streaming plugin `@livekit/agents-plugin-elevenlabs`
- Better Auth: Organization plugin for multi-tenant with owner/admin/member roles

### Metis Review
**Identified Gaps** (addressed):
- LiveKit requires server-side agent process → Added `apps/agent` service with AgentsJS
- Deepgram STTv2 is streaming-capable → Recommended over OpenAI Whisper
- LiveKit room tokens needed for browser auth → Added token generation endpoint
- LangGraph integration via LLMAdapter → Separates reasoning from voice pipeline

---

## Work Objectives

### Core Objective
Build a production-ready voice-based AI training platform that enables companies to onboard, create training scenarios, and have employees practice customer service skills with realistic AI-powered voice conversations.

### Concrete Deliverables
- `apps/fe`: Next.js frontend with shadcn/ui
  - Auth pages (login, register, org creation)
  - Company admin dashboard (trainings, employees, analytics)
  - Employee portal (training browser, voice session UI)
  - Assessment review pages
- `apps/http`: Express REST API
  - Auth endpoints (Better Auth)
  - Training CRUD endpoints
  - Knowledge base upload/embedding endpoints
  - Assessment retrieval endpoints
  - LiveKit room token generation endpoint
- `apps/agent`: LiveKit AgentsJS Service
  - AgentServer with entrypoint for training sessions
  - AgentSession with Deepgram STT + Eleven Labs TTS
  - LangGraph integration via LLMAdapter
  - Avatar/persona generation per session
- `packages/db`: Prisma schema + migrations
- `packages/types`: Shared TypeScript types
- `packages/ai`: LangGraph workflows + OpenAI integration

### Definition of Done
- [ ] Company can register, create org, invite employees
- [ ] Admin can create training with knowledge base documents
- [ ] Employee can start voice session with AI customer
- [ ] Full-duplex conversation works with < 2s latency via LiveKit
- [ ] Session transcript saved with AI assessment
- [ ] All critical paths have E2E tests
- [ ] Deployable to Render

### Must Have
- Multi-tenant isolation (data scoped to organization)
- Real-time voice with VAD-based turn detection
- Session recording and transcript storage
- AI-generated performance assessment
- Role-based access (owner, admin, member)

### Must NOT Have (Guardrails)
- Billing/payments integration (explicitly excluded)
- Mobile apps (web only)
- Video/screen sharing (voice only)
- Real phone integration (browser only)
- Multi-language TTS (English only for v1)
- Custom voice cloning (use Eleven Labs preset voices)
- Offline mode
- File downloads of recordings (streaming only)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO (needs setup)
- **User wants tests**: TDD
- **Framework**: Vitest (unit/integration) + Playwright (E2E)

### Test Infrastructure Setup (Task 0)
Before any feature work:
1. Install Vitest + testing-library for unit tests
2. Install Playwright for E2E tests
3. Configure Turborepo test pipeline
4. Create example tests to verify setup

### TDD Workflow
Each feature task follows RED-GREEN-REFACTOR:
1. **RED**: Write failing test first
2. **GREEN**: Implement minimum code to pass
3. **REFACTOR**: Clean up while keeping green

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - Start Immediately):
├── Task 1: Test infrastructure setup
├── Task 2: Shared packages (types, db schema)
└── Task 3: Environment configuration

Wave 2 (Auth + Core - After Wave 1):
├── Task 4: Better Auth setup
├── Task 5: Database migrations + seed
└── Task 6: UI component library setup (shadcn)

Wave 3 (Features - After Wave 2):
├── Task 7: Auth pages (login, register, org)
├── Task 8: Training CRUD API + UI
├── Task 9: Knowledge base upload + embeddings
└── Task 10: Employee portal UI

Wave 4 (Voice Engine - After Wave 3):
├── Task 11: LiveKit agent service setup
├── Task 12: LangGraph + LiveKit integration
├── Task 13: Voice session UI + LiveKit client
└── Task 14: Full voice pipeline integration

Wave 5 (Assessment + Polish - After Wave 4):
├── Task 15: Session transcript storage
├── Task 16: AI assessment generation
├── Task 17: Assessment dashboard UI
└── Task 18: E2E tests + deployment config
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | All | 2, 3 |
| 2 | None | 4, 5, 8, 9 | 1, 3 |
| 3 | None | 4 | 1, 2 |
| 4 | 2, 3 | 7 | 5, 6 |
| 5 | 2 | 8, 9 | 4, 6 |
| 6 | None | 7, 10 | 4, 5 |
| 7 | 4, 6 | 10 | 8, 9 |
| 8 | 5 | 12 | 7, 9, 10 |
| 9 | 5 | 12 | 7, 8, 10 |
| 10 | 6, 7 | 13 | 8, 9 |
| 11 | None | 13, 14 | 12 |
| 12 | 8, 9 | 14 | 11 |
| 13 | 10, 11 | 15 | 14 |
| 14 | 11, 12 | 15 | 13 |
| 15 | 13, 14 | 16 | None |
| 16 | 15 | 17 | None |
| 17 | 16 | 18 | None |
| 18 | 17 | None | None |

---

## TODOs

### Wave 1: Foundation

---

- [x] 1. Test Infrastructure Setup

  **What to do**:
  - Install Vitest, @testing-library/react, happy-dom in root
  - Install Playwright and configure for apps/fe
  - Add test scripts to root package.json
  - Configure turbo.json with test pipeline
  - Create example unit test in packages/types
  - Create example E2E test in apps/fe

  **Must NOT do**:
  - Don't add tests for non-existent code yet
  - Don't configure CI/CD yet (Task 18)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Configuration task, straightforward setup
  - **Skills**: [`turborepo`]
    - `turborepo`: Pipeline configuration for test tasks

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: All subsequent tasks depend on test infra
  - **Blocked By**: None

  **References**:
  - `turbo.json` - Add test pipeline configuration
  - `package.json` - Root scripts for test commands
  - Vitest docs: https://vitest.dev/guide/

  **Acceptance Criteria**:
  - [ ] `pnpm test` runs Vitest and shows example test passing
  - [ ] `pnpm test:e2e` runs Playwright and shows example test passing
  - [ ] `turbo run test` works with caching

  **Commit**: YES
  - Message: `chore: setup test infrastructure with vitest and playwright`
  - Files: `package.json`, `turbo.json`, `vitest.config.ts`, `playwright.config.ts`

---

- [x] 2. Shared Packages Setup

  **What to do**:
  - Create `packages/types` with shared TypeScript interfaces
  - Create `packages/db` with Prisma schema
  - Create `packages/ai` placeholder for LangGraph workflows
  - Define core types: User, Organization, Training, Session, Assessment
  - Define Prisma schema with PGVector extension
  - Configure package.json for each package with proper exports

  **Must NOT do**:
  - Don't run migrations yet (Task 5)
  - Don't implement AI logic yet (Task 12)
  - Don't add PGVector operations yet (Task 9)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Schema design requires careful thought for multi-tenant + embeddings
  - **Skills**: [`turborepo`]
    - `turborepo`: Internal package configuration

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Tasks 4, 5, 8, 9
  - **Blocked By**: None

  **References**:
  - `pnpm-workspace.yaml` - Add packages/* to workspace
  - Better Auth Organization docs for user/org relationship
  - PGVector Prisma extension: https://github.com/pgvector/pgvector

  **Prisma Schema Requirements**:
  ```prisma
  // Core tables
  model User { ... }           // Better Auth managed
  model Organization { ... }   // Better Auth managed
  model Member { ... }         // Better Auth managed (user-org join)
  
  // Application tables
  model Training {
    id            String   @id @default(cuid())
    organizationId String
    name          String
    description   String
    systemPrompt  String   // AI persona instructions
    createdAt     DateTime @default(now())
    updatedAt     DateTime @updatedAt
  }
  
  model KnowledgeDocument {
    id            String   @id @default(cuid())
    trainingId    String
    filename      String
    content       String
    embedding     Unsupported("vector(1536)")? // OpenAI ada-002
  }
  
  model TrainingSession {
    id            String   @id @default(cuid())
    trainingId    String
    userId        String
    avatarName    String   // Generated AI customer name
    avatarPersona String   // Generated personality
    startedAt     DateTime @default(now())
    endedAt       DateTime?
    transcript    Json?
  }
  
  model Assessment {
    id            String   @id @default(cuid())
    sessionId     String   @unique
    score         Int      // 0-100
    feedback      String
    strengths     String[]
    improvements  String[]
    createdAt     DateTime @default(now())
  }
  ```

  **Acceptance Criteria**:
  - [ ] `packages/types/src/index.ts` exports all shared types
  - [ ] `packages/db/prisma/schema.prisma` compiles without errors
  - [ ] `packages/ai/src/index.ts` exists (placeholder)
  - [ ] `pnpm build` succeeds for all packages

  **Commit**: YES
  - Message: `feat: add shared packages for types, database, and ai`
  - Files: `packages/*`

---

- [x] 3. Environment Configuration

  **What to do**:
  - Create `.env.example` with all required variables
  - Create `packages/config` for shared environment validation (Zod)
  - Configure environment loading for each app
  - Document all required API keys and URLs

  **Must NOT do**:
  - Don't commit real API keys
  - Don't create .env files (user provides)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Configuration file creation, straightforward
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 4 (auth needs env vars)
  - **Blocked By**: None

  **References**:
  - Zod for env validation: https://zod.dev/

  **Environment Variables Required**:
  ```env
  # Database
  DATABASE_URL=postgresql://...
  
  # Better Auth
  BETTER_AUTH_SECRET=...
  BETTER_AUTH_URL=http://localhost:3000
  
  # OpenAI
  OPENAI_API_KEY=sk-...
  
  # LiveKit
  LIVEKIT_API_KEY=...
  LIVEKIT_API_SECRET=...
  LIVEKIT_URL=wss://your-project.livekit.cloud
  
  # Deepgram (STT)
  DEEPGRAM_API_KEY=...
  
  # Eleven Labs (TTS)
  ELEVEN_API_KEY=...
  
  # App URLs
  NEXT_PUBLIC_API_URL=http://localhost:4000
  NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
  ```

  **Acceptance Criteria**:
  - [ ] `.env.example` contains all required variables with descriptions
  - [ ] `packages/config/src/env.ts` exports validated env schema
  - [ ] Each app can import and validate its required env vars
  - [ ] Missing env vars throw clear error messages

  **Commit**: YES
  - Message: `chore: add environment configuration with validation`
  - Files: `.env.example`, `packages/config/*`

---

### Wave 2: Auth + Core Setup

---

- [x] 4. Better Auth Setup

  **What to do**:
  - Install better-auth in apps/http
  - Configure with Organization plugin
  - Set up Prisma adapter
  - Create auth routes in Express
  - Configure session handling
  - Set up client-side auth in apps/fe
  - Define roles: owner (company creator), admin (managers), member (employees)

  **Must NOT do**:
  - Don't add custom auth flows yet
  - Don't implement invitation emails (mock for now)
  - Don't add OAuth providers (email/password only for v1)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Auth is security-critical, requires careful implementation
  - **Skills**: [`better-auth-best-practices`]
    - `better-auth-best-practices`: Organization plugin patterns, session handling

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6)
  - **Blocks**: Task 7 (auth pages need auth)
  - **Blocked By**: Tasks 2, 3

  **References**:
  - Better Auth docs: https://www.better-auth.com/
  - Organization plugin: https://www.better-auth.com/docs/plugins/organization

  **Implementation Pattern**:
  ```typescript
  // apps/http/src/auth.ts
  import { betterAuth } from "better-auth";
  import { organization } from "@better-auth/organization";
  import { prismaAdapter } from "@better-auth/prisma-adapter";
  
  export const auth = betterAuth({
    database: prismaAdapter(prisma),
    plugins: [
      organization({
        allowUserToCreateOrganization: true, // Signup creates org
      }),
    ],
    emailAndPassword: {
      enabled: true,
    },
  });
  ```

  **Acceptance Criteria**:
  - [ ] Test: User can sign up with email/password
  - [ ] Test: Signup creates user AND organization
  - [ ] Test: User can invite member to organization
  - [ ] Test: Session contains activeOrganizationId
  - [ ] `POST /api/auth/sign-up` → 200 with session
  - [ ] `GET /api/auth/session` → returns user + org

  **Commit**: YES
  - Message: `feat: setup better-auth with organization plugin`
  - Files: `apps/http/src/auth.ts`, `apps/fe/src/lib/auth-client.ts`

---

- [x] 5. Database Migrations + Seed

  **What to do**:
  - Create Prisma migration for initial schema
  - Enable pgvector extension in migration
  - Create seed script with:
    - Demo company (organization)
    - Admin user + member user
    - Sample training
    - Sample knowledge documents
  - Document database setup steps

  **Must NOT do**:
  - Don't create production data
  - Don't add embeddings in seed (Task 9)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Migration is mostly automated, seed is simple data
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 6)
  - **Blocks**: Tasks 8, 9
  - **Blocked By**: Task 2

  **References**:
  - `packages/db/prisma/schema.prisma` - Schema from Task 2
  - Prisma migrate: https://www.prisma.io/docs/concepts/components/prisma-migrate

  **Acceptance Criteria**:
  - [ ] `pnpm db:migrate` creates all tables
  - [ ] `pnpm db:seed` populates demo data
  - [ ] PGVector extension enabled (verified via psql)
  - [ ] Demo login works: demo@example.com / password123

  **Commit**: YES
  - Message: `feat: add database migrations and seed data`
  - Files: `packages/db/prisma/migrations/*`, `packages/db/prisma/seed.ts`

---

- [x] 6. UI Component Library Setup

  **What to do**:
  - Initialize shadcn/ui in apps/fe
  - Install base components: Button, Card, Input, Form, Dialog, Table
  - Configure Tailwind with custom theme colors
  - Create layout components: AppShell, Sidebar, Header
  - Set up dark mode support

  **Must NOT do**:
  - Don't build feature-specific components yet
  - Don't add animations beyond shadcn defaults
  - Don't create marketing pages

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI setup, theming, component library
  - **Skills**: [`shadcn-ui`, `frontend-ui-ux`]
    - `shadcn-ui`: Component installation and customization
    - `frontend-ui-ux`: Design system setup

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5)
  - **Blocks**: Tasks 7, 10
  - **Blocked By**: None

  **References**:
  - shadcn/ui: https://ui.shadcn.com/
  - Next.js App Router integration

  **Components to Install**:
  ```bash
  npx shadcn@latest init
  npx shadcn@latest add button card input form dialog table
  npx shadcn@latest add dropdown-menu avatar badge tabs
  npx shadcn@latest add toast sonner
  ```

  **Acceptance Criteria**:
  - [ ] `apps/fe/components/ui/*` contains all base components
  - [ ] `apps/fe/components/layout/app-shell.tsx` renders sidebar + header
  - [ ] Dark mode toggle works
  - [ ] `pnpm dev` shows styled homepage

  **Commit**: YES
  - Message: `feat: setup shadcn-ui component library with layout`
  - Files: `apps/fe/components/*`, `apps/fe/app/globals.css`

---

### Wave 3: Core Features

---

- [x] 7. Auth Pages (Login, Register, Org)

  **What to do**:
  - Create login page with email/password form
  - Create register page (creates user + org)
  - Create organization settings page
  - Create member invitation flow (mock emails, show invite link)
  - Add protected route middleware
  - Implement logout functionality

  **Must NOT do**:
  - Don't add OAuth buttons
  - Don't send real emails (show invite link in UI)
  - Don't add password reset (v2)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Auth forms, protected routes, UI flows
  - **Skills**: [`shadcn-ui`, `better-auth-best-practices`]
    - `shadcn-ui`: Form components with validation
    - `better-auth-best-practices`: Client-side auth patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 9, 10)
  - **Blocks**: Task 10 (employee portal needs auth)
  - **Blocked By**: Tasks 4, 6

  **References**:
  - `apps/http/src/auth.ts` - Auth routes from Task 4
  - `apps/fe/src/lib/auth-client.ts` - Client from Task 4
  - shadcn Form: https://ui.shadcn.com/docs/components/form

  **Pages to Create**:
  ```
  /login          - Email/password login
  /register       - Signup (creates user + org)
  /dashboard      - Redirect based on role
  /settings/org   - Organization settings (admin only)
  /settings/team  - Member management (admin only)
  ```

  **Acceptance Criteria**:
  - [ ] E2E: User can register with email/password
  - [ ] E2E: User can login and see dashboard
  - [ ] E2E: Admin can view team settings
  - [ ] E2E: Unauthenticated user redirected to /login
  - [ ] Form validation shows errors (empty fields, invalid email)

  **Commit**: YES
  - Message: `feat: add auth pages with login, register, and org settings`
  - Files: `apps/fe/app/(auth)/*`, `apps/fe/app/(dashboard)/*`

---

- [x] 8. Training CRUD API + UI

  **What to do**:
  - Create REST endpoints for Training model:
    - `GET /api/trainings` - List trainings (scoped to org)
    - `POST /api/trainings` - Create training
    - `GET /api/trainings/:id` - Get training details
    - `PUT /api/trainings/:id` - Update training
    - `DELETE /api/trainings/:id` - Delete training
  - Create admin UI for training management:
    - Training list with search/filter
    - Create training dialog/form
    - Training detail page with edit
  - Include system prompt field for AI persona configuration

  **Must NOT do**:
  - Don't implement knowledge base yet (Task 9)
  - Don't add training templates/duplication
  - Don't add training versioning

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Core CRUD with proper validation, auth scoping
  - **Skills**: [`shadcn-ui`]
    - `shadcn-ui`: Forms, tables, dialogs

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 7, 9, 10)
  - **Blocks**: Task 12 (LangGraph needs training data)
  - **Blocked By**: Task 5 (needs database)

  **References**:
  - `packages/db/prisma/schema.prisma` - Training model
  - `packages/types/src/training.ts` - Training types
  - Better Auth session for org scoping

  **API Patterns**:
  ```typescript
  // Scoped to organization
  router.get("/trainings", async (req, res) => {
    const session = await auth.api.getSession(req);
    const trainings = await prisma.training.findMany({
      where: { organizationId: session.activeOrganizationId },
    });
    return res.json(trainings);
  });
  ```

  **Acceptance Criteria**:
  - [ ] Test: Admin can create training via API
  - [ ] Test: Training list only shows org's trainings
  - [ ] Test: Member cannot create training (permission)
  - [ ] E2E: Admin creates training via UI form
  - [ ] E2E: Training appears in list after creation
  - [ ] Validation: Name required, system prompt required

  **Commit**: YES
  - Message: `feat: add training CRUD api and admin ui`
  - Files: `apps/http/src/routes/trainings.ts`, `apps/fe/app/(dashboard)/trainings/*`

---

- [x] 9. Knowledge Base Upload + Embeddings

  **What to do**:
  - Add file upload endpoint for knowledge documents
  - Parse documents (PDF, TXT, MD support)
  - Chunk documents for embedding (500 token chunks, 100 overlap)
  - Generate embeddings via OpenAI ada-002
  - Store embeddings in PGVector
  - Create UI for document upload on training detail page
  - Implement RAG retrieval function for LangGraph

  **Must NOT do**:
  - Don't support complex file types (DOCX, XLSX)
  - Don't build document preview
  - Don't add document editing

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Embedding pipeline, RAG setup, PGVector queries
  - **Skills**: [`embedding-strategies`]
    - `embedding-strategies`: Chunking, embedding models, retrieval

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 7, 8, 10)
  - **Blocks**: Task 12 (LangGraph needs RAG)
  - **Blocked By**: Task 5 (needs database with pgvector)

  **References**:
  - `packages/db/prisma/schema.prisma` - KnowledgeDocument model
  - OpenAI Embeddings API: https://platform.openai.com/docs/guides/embeddings
  - PGVector similarity search

  **Implementation Pattern**:
  ```typescript
  // Chunking
  function chunkDocument(content: string, chunkSize = 500, overlap = 100) {
    const chunks = [];
    for (let i = 0; i < content.length; i += chunkSize - overlap) {
      chunks.push(content.slice(i, i + chunkSize));
    }
    return chunks;
  }
  
  // Embedding
  const embedding = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: chunk,
  });
  
  // PGVector storage (raw SQL)
  await prisma.$executeRaw`
    INSERT INTO "KnowledgeDocument" (id, "trainingId", filename, content, embedding)
    VALUES (${id}, ${trainingId}, ${filename}, ${chunk}, ${embedding}::vector)
  `;
  
  // RAG retrieval
  const results = await prisma.$queryRaw`
    SELECT content, 1 - (embedding <=> ${queryEmbedding}::vector) as similarity
    FROM "KnowledgeDocument"
    WHERE "trainingId" = ${trainingId}
    ORDER BY similarity DESC
    LIMIT 5
  `;
  ```

  **Acceptance Criteria**:
  - [ ] Test: Upload .txt file creates document + embeddings
  - [ ] Test: Upload .pdf file parses and embeds
  - [ ] Test: RAG retrieval returns relevant chunks
  - [ ] E2E: Admin uploads document on training page
  - [ ] E2E: Document appears in training's document list
  - [ ] Verify: Embedding dimension is 1536 (ada-002)

  **Commit**: YES
  - Message: `feat: add knowledge base upload with rag embeddings`
  - Files: `apps/http/src/routes/documents.ts`, `packages/ai/src/rag.ts`

---

- [x] 10. Employee Portal UI

  **What to do**:
  - Create employee dashboard (member role view)
  - Show available trainings list
  - Create training detail page with "Start Session" button
  - Show session history with scores
  - Add session preparation screen (microphone check, instructions)

  **Must NOT do**:
  - Don't implement voice yet (Task 13)
  - Don't show admin features to members
  - Don't add training recommendations

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Employee-facing UI, clear UX
  - **Skills**: [`shadcn-ui`, `frontend-ui-ux`]
    - `shadcn-ui`: Cards, badges, status indicators
    - `frontend-ui-ux`: User-friendly training interface

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 7, 8, 9)
  - **Blocks**: Task 13 (voice session needs portal)
  - **Blocked By**: Tasks 6, 7

  **References**:
  - `apps/fe/app/(dashboard)/trainings/*` - Training pages from Task 8
  - Session model from Task 2

  **Pages to Create**:
  ```
  /(dashboard)/employee/          - Employee home (available trainings)
  /(dashboard)/employee/[id]      - Training detail + start session
  /(dashboard)/employee/history   - Past sessions + scores
  /(dashboard)/session/prepare    - Mic check before session
  ```

  **Acceptance Criteria**:
  - [ ] E2E: Employee sees only their role's dashboard
  - [ ] E2E: Employee can browse available trainings
  - [ ] E2E: Employee can view their session history
  - [ ] Test: Member cannot access admin routes (403)
  - [ ] Microphone permission prompt works

  **Commit**: YES
  - Message: `feat: add employee training portal with session history`
  - Files: `apps/fe/app/(dashboard)/employee/*`

---

### Wave 4: Voice Engine (LiveKit)

---

- [x] 11. LiveKit Agent Service Setup

  **What to do**:
  - Create `apps/agent` as new Turborepo app
  - Install LiveKit AgentsJS: `@livekit/agents`
  - Install plugins: `@livekit/agents-plugin-deepgram`, `@livekit/agents-plugin-elevenlabs`, `@livekit/agents-plugin-openai`
  - Create basic AgentServer with entrypoint
  - Configure Deepgram STTv2 for streaming transcription
  - Configure Eleven Labs TTS for voice output
  - Test agent connects to LiveKit room

  **Must NOT do**:
  - Don't integrate LangGraph yet (Task 12)
  - Don't add avatar generation yet (Task 12)
  - Don't build production error handling yet

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: New technology integration, real-time audio infrastructure
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Task 12)
  - **Blocks**: Tasks 13, 14
  - **Blocked By**: None

  **References**:
  - LiveKit Agents docs: https://docs.livekit.io/agents/
  - AgentsJS GitHub: https://github.com/livekit/agents-js
  - Deepgram plugin: `@livekit/agents-plugin-deepgram`
  - Eleven Labs plugin: `@livekit/agents-plugin-elevenlabs`

  **Implementation Pattern**:
  ```typescript
  // apps/agent/src/index.ts
  import { AgentServer, JobContext, Agent, AgentSession } from '@livekit/agents';
  import { STTv2 as DeepgramSTT } from '@livekit/agents-plugin-deepgram';
  import { TTS as ElevenLabsTTS } from '@livekit/agents-plugin-elevenlabs';
  
  async function entrypoint(ctx: JobContext) {
    // Wait for participant to connect
    await ctx.connect();
    
    const agent = new Agent({
      instructions: "You are a customer service training AI...",
    });
    
    const session = new AgentSession({
      stt: new DeepgramSTT(),
      tts: new ElevenLabsTTS({
        voiceId: 'selected_voice_id',
      }),
      llm: openai.LLM({ model: 'gpt-4o' }),
    });
    
    await session.start(agent, ctx.room);
  }
  
  const server = new AgentServer();
  server.addEntrypoint(entrypoint);
  server.run();
  ```

  **Acceptance Criteria**:
  - [ ] `apps/agent` exists in Turborepo workspace
  - [ ] Agent starts and connects to LiveKit Cloud
  - [ ] Test: Agent joins room when dispatched
  - [ ] Test: Deepgram STT transcribes speech
  - [ ] Test: Eleven Labs TTS speaks response
  - [ ] `turbo run dev --filter=agent` starts agent server

  **Commit**: YES
  - Message: `feat: add livekit agent service with deepgram and elevenlabs`
  - Files: `apps/agent/*`, `pnpm-workspace.yaml`

---

- [x] 12. LangGraph + LiveKit Integration

  **What to do**:
  - Create StateGraph for training conversation in `packages/ai`
  - Implement nodes: start, retrieve (RAG), respond, evaluate, end
  - Use LLMAdapter to wrap LangGraph for LiveKit AgentSession
  - Add RAG context injection from knowledge base
  - Create avatar/persona generator (random names, personalities, voice IDs)
  - Integrate with AgentSession from Task 11
  - Create session dispatch API endpoint

  **Must NOT do**:
  - Don't build complex branching logic
  - Don't implement multi-agent scenarios

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Graph-based AI orchestration, LangGraph + LiveKit integration
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Task 11)
  - **Blocks**: Task 14
  - **Blocked By**: Tasks 8, 9 (needs training + RAG)

  **References**:
  - LangGraph: https://langchain-ai.github.io/langgraphjs/
  - LiveKit LangGraph example: https://github.com/livekit/agents/blob/main/examples/voice_agents/langgraph_agent.py
  - `packages/ai/src/rag.ts` - RAG from Task 9

  **LangGraph + LiveKit Pattern**:
  ```typescript
  // packages/ai/src/conversation.ts
  import { StateGraph } from '@langchain/langgraph';
  import { ChatOpenAI } from '@langchain/openai';
  
  interface ConversationState {
    sessionId: string;
    trainingId: string;
    userId: string;
    avatar: { name: string; persona: string; voiceId: string };
    messages: Message[];
    ragContext: string[];
    turnCount: number;
  }
  
  export function createConversationGraph(training: Training) {
    return new StateGraph<ConversationState>()
      .addNode("retrieve", async (state) => {
        const context = await retrieveRAGContext(state.trainingId, state.messages);
        return { ragContext: context };
      })
      .addNode("respond", async (state) => {
        const llm = new ChatOpenAI({ model: 'gpt-4o' });
        const response = await llm.invoke([
          { role: 'system', content: state.avatar.persona },
          { role: 'system', content: `Context: ${state.ragContext.join('\n')}` },
          ...state.messages,
        ]);
        return { messages: [...state.messages, response] };
      })
      .addEdge("retrieve", "respond")
      .compile();
  }
  
  // apps/agent/src/entrypoint.ts
  import { langchain } from '@livekit/agents-plugin-openai';
  import { createConversationGraph } from '@acme/ai';
  
  async function entrypoint(ctx: JobContext) {
    const training = await fetchTraining(ctx.room.metadata.trainingId);
    const graph = createConversationGraph(training);
    
    const agent = new Agent({
      instructions: "",
      llm: langchain.LLMAdapter(graph), // Wrap LangGraph
    });
    
    const session = new AgentSession({
      stt: new DeepgramSTT(),
      tts: new ElevenLabsTTS({ voiceId: avatar.voiceId }),
    });
    
    await session.start(agent, ctx.room);
  }
  ```

  **Avatar Generator**:
  ```typescript
  function generateAvatar(training: Training) {
    const names = ["Alex", "Jordan", "Sam", "Morgan", "Casey"];
    const moods = ["frustrated", "confused", "angry", "polite but firm"];
    const voiceIds = [
      "21m00Tcm4TlvDq8ikWAM", // Rachel
      "AZnzlk1XvdvUeBnXmlld", // Domi
      "EXAVITQu4vr4xnSDxMaL", // Bella
    ];
    
    return {
      name: randomChoice(names),
      persona: `You are ${name}, a customer who is ${randomChoice(moods)}. 
               ${training.systemPrompt}`,
      voiceId: randomChoice(voiceIds),
    };
  }
  ```

  **Acceptance Criteria**:
  - [ ] Test: Graph initializes with avatar persona
  - [ ] Test: User message triggers RAG retrieval
  - [ ] Test: AI response uses RAG context
  - [ ] Test: LLMAdapter wraps LangGraph correctly
  - [ ] Test: Avatar personality consistent within session
  - [ ] API: `POST /api/sessions/dispatch` creates room and dispatches agent

  **Commit**: YES
  - Message: `feat: integrate langgraph with livekit agent`
  - Files: `packages/ai/src/conversation.ts`, `apps/agent/src/entrypoint.ts`, `apps/http/src/routes/sessions.ts`

---

- [x] 13. Voice Session UI + LiveKit Client

  **What to do**:
  - Install LiveKit client SDK: `@livekit/components-react`, `livekit-client`
  - Create voice session page with:
    - Avatar display (name, visual indicator)
    - Real-time transcript view (from agent data messages)
    - Microphone status indicator
    - End session button
  - Create LiveKit room token endpoint in apps/http
  - Connect browser to LiveKit room via WebRTC
  - Handle connection states (connecting, connected, error)
  - Add session timer

  **Must NOT do**:
  - Don't add video (audio only)
  - Don't add visual avatar (just name/icon)
  - Don't implement transcript editing

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Real-time UI, WebRTC state, audio indicators
  - **Skills**: [`shadcn-ui`, `frontend-ui-ux`]
    - `shadcn-ui`: Real-time UI components
    - `frontend-ui-ux`: Voice session UX

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Task 14)
  - **Blocks**: Task 15
  - **Blocked By**: Tasks 10, 11

  **References**:
  - LiveKit React Components: https://docs.livekit.io/reference/components/react/
  - `apps/http/src/routes/sessions.ts` - Session dispatch from Task 12
  - LiveKit client: https://github.com/livekit/client-sdk-js

  **Room Token Endpoint**:
  ```typescript
  // apps/http/src/routes/tokens.ts
  import { AccessToken } from 'livekit-server-sdk';
  
  router.post("/tokens/livekit", async (req, res) => {
    const session = await auth.api.getSession(req);
    if (!session) return res.status(401).json({ error: "Unauthorized" });
    
    const { roomName, trainingId } = req.body;
    
    const token = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      { identity: session.user.id }
    );
    
    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });
    
    return res.json({ token: token.toJwt() });
  });
  ```

  **UI Components**:
  ```tsx
  // apps/fe/app/(dashboard)/session/[id]/page.tsx
  import { LiveKitRoom, RoomAudioRenderer, useDataChannel } from '@livekit/components-react';
  
  function VoiceSession({ token, serverUrl, roomName }) {
    return (
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect={true}
        audio={true}
        video={false}
      >
        <RoomAudioRenderer />
        <AvatarCard />
        <TranscriptPanel />
        <AudioControls />
        <SessionTimer />
        <EndSessionButton />
      </LiveKitRoom>
    );
  }
  ```

  **Acceptance Criteria**:
  - [ ] E2E: Session page loads and connects to LiveKit
  - [ ] E2E: Microphone captures and streams audio
  - [ ] E2E: Transcript updates in real-time (via data channel)
  - [ ] E2E: End session button works
  - [ ] Test: Connection status displayed correctly
  - [ ] Audio visualizer shows when speaking

  **Commit**: YES
  - Message: `feat: add voice session ui with livekit client`
  - Files: `apps/fe/app/(dashboard)/session/*`, `apps/http/src/routes/tokens.ts`

---

- [x] 14. Full Voice Pipeline Integration

  **What to do**:
  - Connect all voice components end-to-end:
    1. Frontend dispatches session → creates LiveKit room
    2. Agent joins room with training context
    3. User speaks → Deepgram STT → transcript
    4. Transcript → LangGraph → AI response
    5. AI response → Eleven Labs TTS → user hears
  - Send transcript updates to frontend via LiveKit data channel
  - Handle session end (user clicks button, timeout, agent ends)
  - Store session metadata for transcript storage (Task 15)
  - Measure and optimize for < 2s latency

  **Must NOT do**:
  - Don't add voice selection UI (use preset voices)
  - Don't implement voice cloning
  - Don't add language selection

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Full pipeline integration, latency optimization
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Task 13)
  - **Blocks**: Task 15
  - **Blocked By**: Tasks 11, 12

  **References**:
  - `apps/agent/src/entrypoint.ts` - Agent from Tasks 11-12
  - `apps/fe/app/(dashboard)/session/*` - UI from Task 13
  - LiveKit data channels: https://docs.livekit.io/realtime/client/data-messages/

  **Full Pipeline**:
  ```
  ┌─────────────────────────────────────────────────────────────┐
  │                        Browser (apps/fe)                     │
  │  ┌─────────┐         ┌──────────────┐                       │
  │  │   Mic   │────────▶│ LiveKit Room │◀──────────────────┐   │
  │  └─────────┘  audio  └──────────────┘    audio (TTS)    │   │
  │                            │                             │   │
  │                            │ WebRTC                      │   │
  └────────────────────────────┼─────────────────────────────┼───┘
                               │                             │
                               ▼                             │
  ┌─────────────────────────────────────────────────────────────┐
  │                     LiveKit Cloud                           │
  │                   (Media Routing)                           │
  └────────────────────────────┬─────────────────────────────────┘
                               │
                               ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                   Agent Server (apps/agent)                  │
  │  ┌──────────────┐    ┌───────────┐    ┌────────────────┐   │
  │  │ Deepgram STT │───▶│ LangGraph │───▶│ Eleven Labs TTS│   │
  │  └──────────────┘    └───────────┘    └────────────────┘   │
  │         │                  │                  │             │
  │         │                  │                  │             │
  │         ▼                  ▼                  ▼             │
  │    transcript         AI response        audio stream       │
  └─────────────────────────────────────────────────────────────┘
  ```

  **Data Channel for Transcripts**:
  ```typescript
  // apps/agent - send transcript updates
  session.on('transcription', (text, isFinal) => {
    ctx.room.localParticipant.publishData(
      JSON.stringify({ type: 'transcript', role: 'user', text, isFinal }),
      { reliable: true }
    );
  });
  
  session.on('agent_speech', (text) => {
    ctx.room.localParticipant.publishData(
      JSON.stringify({ type: 'transcript', role: 'ai', text }),
      { reliable: true }
    );
  });
  ```

  **Acceptance Criteria**:
  - [ ] E2E: Full conversation flow works (speak → AI responds)
  - [ ] Test: Transcript updates appear in real-time
  - [ ] Test: Session ends correctly (button, timeout)
  - [ ] Measure: End-to-end latency < 2 seconds
  - [ ] Test: Multiple concurrent sessions work
  - [ ] Test: Reconnection after network drop

  **Commit**: YES
  - Message: `feat: complete voice pipeline integration`
  - Files: `apps/agent/src/entrypoint.ts`, `apps/fe/app/(dashboard)/session/*`

---

### Wave 5: Assessment + Polish

---

- [x] 15. Session Transcript Storage

  **What to do**:
  - Store full transcript with timestamps
  - Include both user and AI messages
  - Store audio metadata (duration, turn count)
  - Save session end reason (completed, timeout, user ended)
  - Create transcript retrieval API
  - Add transcript view in session history

  **Must NOT do**:
  - Don't store raw audio files (transcripts only)
  - Don't add transcript search
  - Don't add transcript export

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Data storage, straightforward API
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 16
  - **Blocked By**: Tasks 13, 14

  **References**:
  - `packages/db/prisma/schema.prisma` - TrainingSession.transcript
  - WebSocket message format from Task 13

  **Transcript Format**:
  ```typescript
  interface Transcript {
    sessionId: string;
    messages: {
      role: "user" | "ai";
      text: string;
      timestamp: number; // ms from session start
      duration?: number; // speech duration in ms
    }[];
    metadata: {
      totalDuration: number;
      turnCount: number;
      endReason: "completed" | "timeout" | "user_ended";
    };
  }
  ```

  **Acceptance Criteria**:
  - [ ] Test: Transcript saved when session ends
  - [ ] Test: Transcript includes all messages with timestamps
  - [ ] E2E: User can view transcript in history
  - [ ] API: `GET /api/sessions/:id/transcript` returns transcript

  **Commit**: YES
  - Message: `feat: add session transcript storage and retrieval`
  - Files: `apps/http/src/routes/sessions.ts`, `apps/fe/app/(dashboard)/session/[id]/transcript/*`

---

- [x] 16. AI Assessment Generation

  **What to do**:
  - Create assessment generation pipeline:
    1. Session ends → trigger assessment
    2. Send transcript + training criteria to OpenAI
    3. Generate structured assessment
  - Assessment includes:
    - Overall score (0-100)
    - Category scores (empathy, clarity, resolution, professionalism)
    - Strengths list
    - Improvements list
    - Specific quote highlights
  - Store assessment in database
  - Create assessment API endpoint

  **Must NOT do**:
  - Don't add manual assessment editing
  - Don't add peer review
  - Don't add assessment appeals

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Prompt engineering for consistent assessments
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 17
  - **Blocked By**: Task 15

  **References**:
  - `packages/db/prisma/schema.prisma` - Assessment model
  - `packages/ai/src/conversation.ts` - OpenAI patterns

  **Assessment Prompt**:
  ```typescript
  const assessmentPrompt = `
  You are an expert call center trainer. Analyze this training session transcript 
  and provide a detailed assessment.
  
  TRAINING CONTEXT:
  ${training.description}
  ${training.systemPrompt}
  
  TRANSCRIPT:
  ${transcript.messages.map(m => `${m.role}: ${m.text}`).join('\n')}
  
  Provide assessment as JSON:
  {
    "score": 0-100,
    "categories": {
      "empathy": { "score": 0-100, "notes": "..." },
      "clarity": { "score": 0-100, "notes": "..." },
      "resolution": { "score": 0-100, "notes": "..." },
      "professionalism": { "score": 0-100, "notes": "..." }
    },
    "strengths": ["...", "..."],
    "improvements": ["...", "..."],
    "highlights": [
      { "quote": "...", "type": "positive|negative", "note": "..." }
    ]
  }
  `;
  ```

  **Acceptance Criteria**:
  - [ ] Test: Assessment generated within 30s of session end
  - [ ] Test: Assessment includes all required fields
  - [ ] Test: Score is 0-100 integer
  - [ ] E2E: Assessment visible in session detail
  - [ ] API: `GET /api/sessions/:id/assessment` returns assessment

  **Commit**: YES
  - Message: `feat: add ai-powered session assessment generation`
  - Files: `packages/ai/src/assessment.ts`, `apps/http/src/routes/assessments.ts`

---

- [x] 17. Assessment Dashboard UI

  **What to do**:
  - Create employee assessment view:
    - Overall score with visual gauge
    - Category breakdown chart
    - Strengths/improvements lists
    - Quote highlights with context
  - Create admin analytics dashboard:
    - Team average scores over time
    - Training effectiveness comparison
    - Employee progress tracking
  - Add session replay (transcript with AI responses)

  **Must NOT do**:
  - Don't add PDF export
  - Don't add comparison between employees (privacy)
  - Don't add gamification/leaderboards

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Data visualization, charts, dashboard design
  - **Skills**: [`shadcn-ui`, `ui-ux-pro-max`]
    - `shadcn-ui`: Cards, progress indicators
    - `ui-ux-pro-max`: Dashboard design patterns

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 18
  - **Blocked By**: Task 16

  **References**:
  - `packages/db/prisma/schema.prisma` - Assessment model
  - `packages/types/src/assessment.ts` - Assessment types
  - Chart library: recharts or chart.js

  **UI Components**:
  ```
  /session/[id]/assessment
  ├── Score Gauge (circular progress)
  ├── Category Cards (4x with mini charts)
  ├── Strengths List (green checkmarks)
  ├── Improvements List (yellow warnings)
  └── Highlights Section (quotes with context)
  
  /admin/analytics
  ├── Team Overview Card
  ├── Score Trend Chart (line)
  ├── Training Comparison (bar)
  └── Recent Sessions Table
  ```

  **Acceptance Criteria**:
  - [ ] E2E: Employee sees assessment after session
  - [ ] E2E: Score gauge renders correctly
  - [ ] E2E: Admin sees team analytics
  - [ ] Charts render with real data
  - [ ] Mobile-responsive layout

  **Commit**: YES
  - Message: `feat: add assessment dashboard for employees and admins`
  - Files: `apps/fe/app/(dashboard)/session/[id]/assessment/*`, `apps/fe/app/(dashboard)/admin/analytics/*`

---

- [x] 18. E2E Tests + Deployment Config

  **What to do**:
  - Create comprehensive E2E test suite:
    - Auth flow (register, login, logout)
    - Training CRUD (admin creates, views, edits)
    - Voice session (start, speak, end) - mock audio
    - Assessment view
  - Create Render deployment configuration:
    - render.yaml with all services
    - Database (PostgreSQL with pgvector)
    - Environment variable setup
  - Add CI/CD GitHub Actions workflow
  - Create production checklist

  **Must NOT do**:
  - Don't test Eleven Labs in E2E (use mocks)
  - Don't add load testing
  - Don't add security scanning (v2)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Comprehensive testing, deployment config
  - **Skills**: [`playwright`]
    - `playwright`: E2E test patterns

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Final (after all features)
  - **Blocks**: None (final task)
  - **Blocked By**: Task 17

  **References**:
  - Playwright docs: https://playwright.dev/
  - Render docs: https://render.com/docs
  - All previous task implementations

  **E2E Test Scenarios**:
  ```typescript
  // Auth
  test("user can register and login", async ({ page }) => {
    await page.goto("/register");
    await page.fill("[name=email]", "test@example.com");
    await page.fill("[name=password]", "password123");
    await page.fill("[name=company]", "Test Company");
    await page.click("button[type=submit]");
    await expect(page).toHaveURL("/dashboard");
  });
  
  // Training CRUD
  test("admin can create training", async ({ page }) => {
    await login(page, "admin@example.com");
    await page.goto("/trainings");
    await page.click("button:has-text('Create Training')");
    await page.fill("[name=name]", "Customer Support 101");
    await page.fill("[name=systemPrompt]", "You are a frustrated customer...");
    await page.click("button:has-text('Save')");
    await expect(page.locator("text=Customer Support 101")).toBeVisible();
  });
  
  // Voice session (mocked)
  test("employee can start and end session", async ({ page }) => {
    await login(page, "employee@example.com");
    await page.goto("/employee/trainings/1");
    await mockMicrophone(page);
    await page.click("button:has-text('Start Session')");
    await expect(page.locator(".avatar-name")).toBeVisible();
    await page.click("button:has-text('End Session')");
    await expect(page).toHaveURL(/\/session\/.*\/assessment/);
  });
  ```

  **Render Configuration**:
  ```yaml
  # render.yaml
  services:
    - type: web
      name: fe
      runtime: node
      buildCommand: pnpm install && pnpm build
      startCommand: pnpm start
      envVars:
        - key: NEXT_PUBLIC_API_URL
          fromService: http
        - key: NEXT_PUBLIC_LIVEKIT_URL
          sync: false
          
    - type: web
      name: http
      runtime: node
      buildCommand: pnpm install && pnpm build
      startCommand: pnpm start
      envVars:
        - key: DATABASE_URL
          fromDatabase: db
        - key: LIVEKIT_API_KEY
          sync: false
        - key: LIVEKIT_API_SECRET
          sync: false
          
    - type: worker
      name: agent
      runtime: node
      buildCommand: pnpm install && pnpm build
      startCommand: pnpm start
      envVars:
        - key: LIVEKIT_URL
          sync: false
        - key: LIVEKIT_API_KEY
          sync: false
        - key: LIVEKIT_API_SECRET
          sync: false
        - key: DEEPGRAM_API_KEY
          sync: false
        - key: ELEVEN_API_KEY
          sync: false
        - key: OPENAI_API_KEY
          sync: false
        - key: DATABASE_URL
          fromDatabase: db
       
  databases:
    - name: db
      databaseName: callcenter
      postgresMajorVersion: 15
  ```

  **Acceptance Criteria**:
  - [ ] All E2E tests pass: `pnpm test:e2e`
  - [ ] CI runs tests on PR
  - [ ] render.yaml deploys all services
  - [ ] Production environment works end-to-end
  - [ ] Documentation: DEPLOYMENT.md with setup steps

  **Commit**: YES
  - Message: `feat: add e2e tests and render deployment config`
  - Files: `apps/fe/e2e/*`, `render.yaml`, `.github/workflows/ci.yml`

---

## Commit Strategy

| After Task | Message | Key Files |
|------------|---------|-----------|
| 1 | `chore: setup test infrastructure` | vitest.config.ts, playwright.config.ts |
| 2 | `feat: add shared packages` | packages/* |
| 3 | `chore: add env configuration` | .env.example, packages/config/* |
| 4 | `feat: setup better-auth` | apps/http/src/auth.ts |
| 5 | `feat: add database migrations` | packages/db/prisma/* |
| 6 | `feat: setup shadcn-ui` | apps/fe/components/* |
| 7 | `feat: add auth pages` | apps/fe/app/(auth)/* |
| 8 | `feat: add training crud` | apps/http/src/routes/trainings.ts |
| 9 | `feat: add knowledge base rag` | packages/ai/src/rag.ts |
| 10 | `feat: add employee portal` | apps/fe/app/(dashboard)/employee/* |
| 11 | `feat: add livekit agent service` | apps/agent/* |
| 12 | `feat: integrate langgraph with livekit` | packages/ai/src/conversation.ts |
| 13 | `feat: add voice session ui with livekit` | apps/fe/app/(dashboard)/session/* |
| 14 | `feat: complete voice pipeline integration` | apps/agent/src/entrypoint.ts |
| 15 | `feat: add transcript storage` | apps/http/src/routes/sessions.ts |
| 16 | `feat: add ai assessment` | packages/ai/src/assessment.ts |
| 17 | `feat: add assessment dashboard` | apps/fe/app/(dashboard)/admin/* |
| 18 | `feat: add e2e tests + deploy` | render.yaml, e2e/* |

---

## Success Criteria

### Verification Commands
```bash
# All tests pass
pnpm test                    # Unit tests (Vitest)
pnpm test:e2e               # E2E tests (Playwright)

# Apps start successfully
turbo run dev               # All apps running

# Database migrations
pnpm db:migrate            # No errors
pnpm db:seed               # Seed data created

# Type checking
pnpm typecheck             # No TypeScript errors

# Build succeeds
turbo run build            # All apps build
```

### Final Checklist
- [ ] Company can register and create organization
- [ ] Admin can create training with knowledge base
- [ ] Employee can browse trainings and start session
- [ ] Voice conversation works with < 2s latency via LiveKit
- [ ] Session transcript saved correctly
- [ ] AI assessment generated after session
- [ ] Dashboard shows analytics
- [ ] All E2E tests pass
- [ ] Deployable to Render (fe, http, agent services)
