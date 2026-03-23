#!/bin/bash
# GitNexus — Entrypoint Script
# Ensures at least one repo is indexed before starting eval-server.
# If no indexed repos found, clone the default repo and analyze it.

set -e

GITNEXUS_DIR="${HOME}/.gitnexus"
REPOS_DIR="/app/data/repos"
PORT="${PORT:-4848}"

# Check if registry.json exists and has entries
has_indexed_repos() {
    if [ -f "${GITNEXUS_DIR}/registry.json" ]; then
        # Check if registry has at least one entry
        node -e "
            const r = require('${GITNEXUS_DIR}/registry.json');
            const repos = Array.isArray(r) ? r : (r.repos || []);
            process.exit(repos.length > 0 ? 0 : 1);
        " 2>/dev/null
        return $?
    fi
    return 1
}

if has_indexed_repos; then
    echo "GitNexus: Found indexed repos, starting eval-server..."
else
    echo "GitNexus: No indexed repos found. Bootstrapping..."

    # Clone the default repo if not already present
    REPO_URL="${DEFAULT_REPO:-https://github.com/lktiep/cortex-hub.git}"
    REPO_NAME=$(basename "$REPO_URL" .git)
    REPO_PATH="${REPOS_DIR}/${REPO_NAME}"

    mkdir -p "$REPOS_DIR"

    if [ ! -d "$REPO_PATH/.git" ]; then
        echo "GitNexus: Cloning $REPO_URL..."
        git clone --depth 1 "$REPO_URL" "$REPO_PATH" 2>&1 || {
            echo "GitNexus: Clone failed, but starting eval-server anyway..."
            exec gitnexus eval-server --port "$PORT" --idle-timeout 0 2>&1 || {
                echo "GitNexus: eval-server failed to start. Sleeping to prevent restart loop..."
                sleep 3600
            }
        }
    else
        echo "GitNexus: Repo already cloned at $REPO_PATH, pulling latest..."
        cd "$REPO_PATH" && git pull --ff-only 2>/dev/null || true
    fi

    # Analyze the repo
    echo "GitNexus: Analyzing $REPO_PATH..."
    cd "$REPO_PATH" && gitnexus analyze 2>&1 || {
        echo "GitNexus: Analyze failed. Starting eval-server anyway..."
    }
fi

# Start the eval-server
echo "GitNexus: Starting eval-server on port $PORT..."
exec gitnexus eval-server --port "$PORT" --idle-timeout 0
