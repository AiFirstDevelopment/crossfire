#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo -e "${YELLOW}════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}                    Crossfire Release Script                     ${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Ensure we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo -e "${RED}Error: Must be on main branch to release. Currently on: $CURRENT_BRANCH${NC}"
  exit 1
fi

# Ensure working directory is clean
if [ -n "$(git status --porcelain)" ]; then
  echo -e "${RED}Error: Working directory is not clean. Commit or stash changes first.${NC}"
  git status --short
  exit 1
fi

# Pull latest changes
echo ""
echo -e "${YELLOW}[1/7] Pulling latest changes...${NC}"
echo -e "${YELLOW}────────────────────────────────${NC}"
git pull origin main

# Get the latest tag and increment version
LATEST_TAG=$(git tag -l 'v*' --sort=-v:refname | head -n1)
if [ -z "$LATEST_TAG" ]; then
  NEW_VERSION="v1.0.0"
else
  # Extract version numbers
  VERSION=${LATEST_TAG#v}
  IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"

  # Increment patch version
  PATCH=$((PATCH + 1))
  NEW_VERSION="v${MAJOR}.${MINOR}.${PATCH}"
fi

echo -e "${YELLOW}Previous version: ${LATEST_TAG:-none}${NC}"
echo -e "${YELLOW}New version: $NEW_VERSION${NC}"

# Allow override via argument
if [ -n "$1" ]; then
  NEW_VERSION="$1"
  echo -e "${YELLOW}Using provided version: $NEW_VERSION${NC}"
fi

# Run E2E tests
echo ""
echo -e "${YELLOW}[2/7] Running E2E tests...${NC}"
echo -e "${YELLOW}────────────────────────────────${NC}"
npm run test:e2e
if [ $? -ne 0 ]; then
  echo -e "${RED}E2E tests failed. Aborting release.${NC}"
  exit 1
fi
echo -e "${GREEN}E2E tests passed!${NC}"

# Update version in index.html
echo ""
echo -e "${YELLOW}[3/7] Updating version in index.html...${NC}"
echo -e "${YELLOW}────────────────────────────────${NC}"
sed -i '' "s/title=\"Version: [^\"]*\"/title=\"Version: $NEW_VERSION\"/" frontend/index.html

# Commit the version change
git add frontend/index.html
git commit -m "Release $NEW_VERSION

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

# Generate release notes from commits since last tag
echo ""
echo -e "${YELLOW}[4/7] Generating release notes...${NC}"
echo -e "${YELLOW}────────────────────────────────${NC}"
if [ -z "$LATEST_TAG" ]; then
  # First release - get all commits
  COMMITS=$(git log --oneline --no-merges | head -20)
else
  # Get commits since last tag
  COMMITS=$(git log ${LATEST_TAG}..HEAD --oneline --no-merges)
fi

# Create the tag with release notes
echo -e "${YELLOW}Creating tag $NEW_VERSION${NC}"
git tag -a "$NEW_VERSION" -m "Release $NEW_VERSION - $(date +%Y-%m-%d)

Changes:
$COMMITS"

echo -e "${GREEN}Release notes:${NC}"
echo "$COMMITS"
echo ""

# Broadcast maintenance warning to connected clients (3 min conservative estimate)
# Frontend will show countdown, then poll for new version until deployment completes
echo ""
echo -e "${YELLOW}[5/7] Broadcasting maintenance warning...${NC}"
echo -e "${YELLOW}────────────────────────────────${NC}"
MAINTENANCE_RESPONSE=$(curl -s -X POST \
  "https://crossfire-worker.joelstevick.workers.dev/api/matchmaking/broadcast-maintenance" \
  -H "Content-Type: application/json" \
  -d "{\"countdownSeconds\": 180, \"version\": \"$NEW_VERSION\"}")
echo "Response: $MAINTENANCE_RESPONSE"
CLIENT_COUNT=$(echo "$MAINTENANCE_RESPONSE" | grep -o '"clientCount":[0-9]*' | cut -d':' -f2)
echo -e "${GREEN}Notified ${CLIENT_COUNT:-0} connected clients (3 min countdown started)${NC}"
echo -e "${YELLOW}Users will see countdown, then auto-reload when deployment completes${NC}"

# Deploy worker
echo ""
echo -e "${YELLOW}[6/7] Deploying worker...${NC}"
echo -e "${YELLOW}────────────────────────────────${NC}"
cd worker && npx wrangler deploy
cd ..

# Build and deploy frontend
echo ""
echo -e "${YELLOW}[7/7] Building and deploying frontend...${NC}"
echo -e "${YELLOW}────────────────────────────────${NC}"
cd frontend && npm run build && npx wrangler pages deploy dist --project-name=crossfire
cd ..

# Push the commit and tag (happens in parallel with user reloads)
echo ""
echo -e "${YELLOW}Pushing to remote...${NC}"
echo -e "${YELLOW}────────────────────────────────${NC}"
git push origin main
git push origin "$NEW_VERSION"

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}                Release $NEW_VERSION complete!                   ${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "To rollback to a previous version:"
echo "  npm run rollback <version>"
echo ""
echo "Example:"
echo "  npm run rollback $LATEST_TAG"
