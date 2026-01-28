
## 2026-01-28 Task 16: Pre-existing LSP Issues in sessions.ts
- LSP reports `Property 'trainingSession' does not exist on type 'PrismaClient'`
- Also reports missing `systemPrompt` on Training type
- Root cause: Prisma client not regenerated after schema changes
- Fix: Run `pnpm prisma generate` in packages/db to sync types
- These errors are pre-existing and not caused by route ordering fix

## 2026-01-28 Task: @repo/db CI build fix
- Added prisma generate as prebuild in packages/db so PrismaClient types exist in CI.
- Added node types in packages/db tsconfig and devDependencies to satisfy process typings.
