# Production Deployment Checklist

## Pre-Deployment

### Environment Variables

All services require specific environment variables configured on Render:

**Frontend (fe)**
- [ ] `NEXT_PUBLIC_API_URL` - Set via `fromService` from http service
- [ ] `NEXT_PUBLIC_WS_URL` - Set via `fromService` from ws service  
- [ ] `NEXT_PUBLIC_LIVEKIT_URL` - LiveKit cloud URL (must be configured manually)

**HTTP API (http)**
- [ ] `DATABASE_URL` - PostgreSQL connection string (auto-configured from db)
- [ ] `BETTER_AUTH_SECRET` - Random 32+ character secret for session encryption
- [ ] `BETTER_AUTH_URL` - Public URL of http service
- [ ] `LIVEKIT_API_KEY` - From LiveKit Cloud dashboard
- [ ] `LIVEKIT_API_SECRET` - From LiveKit Cloud dashboard
- [ ] `LIVEKIT_URL` - LiveKit server WebSocket URL
- [ ] `DEEPGRAM_API_KEY` - For speech-to-text transcription
- [ ] `ELEVEN_API_KEY` - For text-to-speech synthesis
- [ ] `OPENAI_API_KEY` - For AI chat completions and embeddings

**WebSocket Service (ws)**
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `PORT_WS` - Set to 10000 (Render default)

**Agent Worker (agent)**
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `BETTER_AUTH_SECRET` - Same as http service
- [ ] `BETTER_AUTH_URL` - URL of http service
- [ ] `LIVEKIT_API_KEY` - Same as http service
- [ ] `LIVEKIT_API_SECRET` - Same as http service  
- [ ] `LIVEKIT_URL` - Same as http service
- [ ] `DEEPGRAM_API_KEY` - Same as http service
- [ ] `ELEVEN_API_KEY` - Same as http service
- [ ] `OPENAI_API_KEY` - Same as http service

### Database

- [ ] PostgreSQL 15 instance provisioned
- [ ] Database migrations applied: `pnpm prisma migrate deploy`
- [ ] Prisma client generated: `pnpm prisma generate`
- [ ] (Optional) Seed data applied: `pnpm prisma db seed`

### External Services

- [ ] LiveKit Cloud project created
- [ ] Deepgram API account with sufficient credits
- [ ] ElevenLabs API account with TTS quota
- [ ] OpenAI API account with GPT-4 and embedding access

## Build & Test

### Local Verification

- [ ] `pnpm install` completes without errors
- [ ] `pnpm build` succeeds for all packages
- [ ] `pnpm test` passes all unit tests
- [ ] `pnpm test:e2e` passes all E2E tests (requires running frontend)

### E2E Test Coverage

The E2E test suite (`apps/fe/e2e/example.spec.ts`) covers:

**Authentication Flows**
- [ ] User registration with organization creation
- [ ] User login with credentials
- [ ] User logout via header dropdown

**Training Management (Admin)**
- [ ] Create new training scenario
- [ ] Edit existing training
- [ ] Delete training with confirmation
- [ ] View training detail with knowledge base documents
- [ ] Empty state for non-admin users

**Employee Dashboard**
- [ ] Display available trainings
- [ ] Display session history with scores
- [ ] Display session statistics
- [ ] Start training navigation to prepare page

**Voice Session Flow**
- [ ] Mic check - enable microphone
- [ ] Mic check - handle permission denied
- [ ] Prepare page to session navigation
- [ ] Session UI with End Session button
- [ ] Session end navigates to dashboard

**Assessment**
- [ ] Display overall score and feedback
- [ ] Display category breakdown with scores
- [ ] Display conversation highlights with badges

**Admin Analytics**
- [ ] Overview metrics cards (sessions, members, scores, completion)
- [ ] Recent sessions table
- [ ] Training performance breakdown

### CI/CD Pipeline

- [ ] GitHub Actions workflow configured (`.github/workflows/ci.yml`)
- [ ] Playwright browsers install step present
- [ ] Build step runs before E2E tests
- [ ] All checks pass on main branch

## Render Deployment

### Services Configuration

Verify `render.yaml` contains:

- [ ] `fe` - Web service (Next.js frontend)
- [ ] `http` - Web service (Hono HTTP API)
- [ ] `ws` - Web service (WebSocket server)
- [ ] `agent` - Worker service (LiveKit voice agent)
- [ ] `db` - PostgreSQL 15 database

### Build Commands

- [ ] fe: `pnpm --filter fe build`
- [ ] http: `pnpm --filter @acme/http build`
- [ ] ws: `pnpm --filter @acme/ws build`
- [ ] agent: `pnpm --filter agent build`

### Start Commands

- [ ] fe: `pnpm --filter fe start`
- [ ] http: `pnpm --filter @acme/http start`
- [ ] ws: `pnpm --filter @acme/ws start`
- [ ] agent: `pnpm --filter agent start`

### Health Checks

- [ ] Frontend loads at root URL
- [ ] API responds at `/api/health` or similar
- [ ] WebSocket accepts connections
- [ ] Agent connects to LiveKit room

## Post-Deployment

### Verification Steps

1. [ ] Register a new user account
2. [ ] Create an organization
3. [ ] Create a training scenario as admin
4. [ ] Upload a knowledge base document
5. [ ] Start a voice training session as employee
6. [ ] Complete session and verify assessment generated
7. [ ] View assessment page with scores and highlights
8. [ ] Admin analytics dashboard loads data

### Monitoring

- [ ] Error tracking configured (Sentry, etc.)
- [ ] Application logs accessible on Render
- [ ] Database metrics monitored
- [ ] API response times within acceptable range

### Security

- [ ] HTTPS enforced on all endpoints
- [ ] CORS configured for frontend domain only
- [ ] Authentication cookies set with Secure flag
- [ ] Rate limiting enabled on sensitive endpoints
- [ ] Environment variables marked as secrets

## Rollback Plan

If deployment fails:

1. Revert to previous Render deploy via dashboard
2. Or push revert commit to main branch
3. Verify database migrations are backward compatible
4. Notify team of rollback status

## Scaling Considerations

- Frontend: Horizontal scaling supported
- HTTP API: Horizontal scaling supported
- WebSocket: Sticky sessions may be needed
- Agent: Single instance per LiveKit room
- Database: Vertical scaling first, read replicas if needed
