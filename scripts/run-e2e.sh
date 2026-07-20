#!/usr/bin/env bash
# Live read-only router e2e. The Rust suite reads credentials from .env.e2e only.
# Do not try wrong passwords — the router may lock logins for ~5 minutes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/.env.e2e"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}"
  echo "Copy the example and fill in your router credentials:"
  echo "  cp .env.e2e.example .env.e2e"
  echo "Required keys: ROUTER_IP, ROUTER_PASSWORD"
  exit 1
fi

missing=()
# shellcheck disable=SC1090
set -a
source "${ENV_FILE}"
set +a

if [[ -z "${ROUTER_IP:-}" ]]; then
  missing+=("ROUTER_IP")
fi
if [[ -z "${ROUTER_PASSWORD:-}" ]]; then
  missing+=("ROUTER_PASSWORD")
fi

if ((${#missing[@]} > 0)); then
  echo "${ENV_FILE} is missing required key(s): ${missing[*]}"
  echo "Edit the file and set those values (use the real router password only)."
  exit 1
fi

echo "Running live e2e against ${ROUTER_IP} (credentials from .env.e2e)..."
cd "${ROOT}"
exec npm run test:e2e
