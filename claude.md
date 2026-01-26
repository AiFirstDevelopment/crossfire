# Claude Code Guidelines for Crossfire

## Deployment Rules
- **Always deploy after making any changes** - both worker and frontend if applicable
- **Only commit when explicitly asked** by the user

## Deployment Commands
- Worker: `cd worker && npx wrangler deploy`
- Frontend: `cd frontend && npx wrangler pages deploy dist --project-name=crossfire`
