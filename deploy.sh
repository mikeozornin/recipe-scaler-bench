#!/usr/bin/env bash
# Deploy the static site. Wraps site/ansible/deploy-files.yml (local-only, gitignored).
#
#   ./deploy.sh                 # build + rsync dist/ + verify live site
#   ./deploy.sh --skip-build    # deploy the existing dist/ without rebuilding
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANSIBLE_DIR="$ROOT/site/ansible"

if [[ ! -f "$ANSIBLE_DIR/deploy-files.yml" ]]; then
  echo "deploy: $ANSIBLE_DIR/deploy-files.yml not found (site/ansible is local-only)" >&2
  exit 1
fi

if ! command -v ansible-playbook >/dev/null 2>&1; then
  echo "deploy: ansible-playbook is not installed" >&2
  exit 1
fi

cd "$ANSIBLE_DIR"

if [[ "${1:-}" == "--skip-build" ]]; then
  exec ansible-playbook deploy-files.yml -e skip_build=true
fi

exec ansible-playbook deploy-files.yml
