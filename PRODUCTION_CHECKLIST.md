# Production Deployment Checklist

## Environment
- [ ] Set `NODE_ENV=production`
- [ ] Verify all required environment variables are set in the production environment
- [ ] Audit `.env.example` to ensure it matches production requirements (no secrets)

## Database
- [ ] Run and verify all database migrations
- [ ] Validate database connection strings and access permissions
- [ ] Ensure database backup strategy is active and tested
- [ ] Populate initial seed/demo data if required

## Services
- [ ] **LiveKit**: Verify API Key, Secret, and Host URL
- [ ] **Deepgram**: Verify API Key and project settings
- [ ] **ElevenLabs**: Verify API Key and voice IDs
- [ ] Check service quotas and rate limits for all providers

## Security
- [ ] Enable and verify Authentication (Auth) providers and secrets
- [ ] Audit CORS settings for production domains
- [ ] Verify SSL/TLS certificates are active
- [ ] Ensure no debug or development ports are exposed

## Observability
- [ ] Set up error monitoring (e.g., Sentry, LogRocket)
- [ ] Configure performance monitoring and alerts
- [ ] Verify centralized logging is capturing production logs
- [ ] Set up uptime checks and status page integrations

## Deployment
- [ ] Verify build process completes without errors
- [ ] Run pre-deployment test suite in a staging environment
- [ ] Check asset minification and bundling
- [ ] Validate static file serving and CDN configuration

## Rollback
- [ ] Document the rollback procedure
- [ ] Verify access to previous stable build/container images
- [ ] Ensure database rollback scripts or snapshots are available
- [ ] Confirm team access to deployment and rollback tools
