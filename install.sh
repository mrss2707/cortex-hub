#!/bin/bash
# Cortex Hub — One-Command Entry Point
# This script handles the initial clone and delegates to internal scripts.

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}>>> Bootstrapping Cortex Hub...${NC}"

# 1. Clone if not in repo
if [ ! -d ".git" ]; then
    echo -e "${BLUE}>>> Cloning Cortex Hub repository...${NC}"
    git clone https://github.com/lktiep/cortex-hub.git
    cd cortex-hub
fi

# 2. Execute Admin Installation
if [ -f "scripts/install-hub.sh" ]; then
    bash scripts/install-hub.sh
else
    echo "Error: scripts/install-hub.sh not found."
    exit 1
fi

# 3. Offer immediate onboarding
echo -e "${GREEN}>>> Installation Finished! Shall we onboard the current workspace? (y/n)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    bash scripts/onboard.sh
fi

echo -e "${BLUE}>>> Setup complete. Check README.md for dashboard access.${NC}"
