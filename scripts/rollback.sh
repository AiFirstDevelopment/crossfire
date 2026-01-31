#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Crossfire Rollback Script ===${NC}"

# Check if version argument provided
if [ -z "$1" ]; then
  echo -e "${RED}Error: Version argument required${NC}"
  echo ""
  echo "Usage: npm run rollback <version>"
  echo ""
  echo "Available versions:"
  git tag -l 'v*' --sort=-v:refname | head -n10
  exit 1
fi

TARGET_VERSION="$1"

# Verify the tag exists
if ! git rev-parse "$TARGET_VERSION" >/dev/null 2>&1; then
  echo -e "${RED}Error: Tag '$TARGET_VERSION' not found${NC}"
  echo ""
  echo "Available versions:"
  git tag -l 'v*' --sort=-v:refname | head -n10
  exit 1
fi

# Ensure working directory is clean
if [ -n "$(git status --porcelain)" ]; then
  echo -e "${RED}Error: Working directory is not clean. Commit or stash changes first.${NC}"
  git status --short
  exit 1
fi

echo -e "${YELLOW}Rolling back to $TARGET_VERSION...${NC}"

# Save current branch
CURRENT_BRANCH=$(git branch --show-current)

# Checkout the tag
echo -e "${YELLOW}Checking out $TARGET_VERSION...${NC}"
git checkout "$TARGET_VERSION"

# Deploy worker
echo -e "${YELLOW}Deploying worker from $TARGET_VERSION...${NC}"
cd worker && npx wrangler deploy
cd ..

# Build and deploy frontend
echo -e "${YELLOW}Building and deploying frontend from $TARGET_VERSION...${NC}"
cd frontend && npm run build && npx wrangler pages deploy dist --project-name=crossfire
cd ..

# Return to original branch
echo -e "${YELLOW}Returning to $CURRENT_BRANCH branch...${NC}"
git checkout "$CURRENT_BRANCH"

echo -e "${GREEN}=== Rollback to $TARGET_VERSION complete! ===${NC}"
echo ""
echo -e "${YELLOW}Note: You are now back on the $CURRENT_BRANCH branch.${NC}"
echo "The deployed code is from $TARGET_VERSION."
echo ""
echo "If you need to stay on the rollback version for fixes:"
echo "  git checkout -b hotfix/$TARGET_VERSION $TARGET_VERSION"
