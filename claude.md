# Claude Code Guidelines for Crossfire

## Testing Rules
- **Always run E2E tests locally before committing or deploying**: `npm run test:e2e`
- Tests must pass before proceeding with commit or deploy

## Deployment Rules
- **Always deploy after making any changes** - both worker and frontend if applicable
- **Only commit when explicitly asked** by the user

## Commands
- E2E Tests (local): `npm run test:e2e`
- E2E Tests (production): `npm run test:e2e:prod`
- Worker deploy: `cd worker && npx wrangler deploy`
- Frontend deploy: `cd frontend && npx wrangler pages deploy dist --project-name=crossfire`
