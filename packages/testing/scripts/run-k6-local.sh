#!/usr/bin/env bash
set -euo pipefail

# --- OS detection (macOS vs Linux) for host access from Docker ---
OS="$(uname -s || echo unknown)"
DOCKER_EXTRA=()
case "$OS" in
  Linux) DOCKER_EXTRA+=(--add-host=host.docker.internal:host-gateway) ;;  # needed on Linux
  Darwin) : ;;  # nothing extra on macOS
  *) echo "Unsupported OS: $OS"; exit 1 ;;
esac

# --- k6 image (override with K6_IMAGE if needed) ---
K6_IMAGE="${K6_IMAGE:-grafana/k6}"

# --- Local tests folder to mount into the container ---

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOUNT_LOCAL="${MOUNT_LOCAL:-$SCRIPT_DIR/../../tests}"
WORKDIR_IN="/scripts"

# --- Base URL for the system under test ---
BASE_URL_DEFAULT="${BASE_URL:-http://host.docker.internal:3000}"

# --- Pass environment variables to k6 (only if present) ---
ENV_ARGS=()
ENV_ARGS+=(-e "BASE_URL=${BASE_URL_DEFAULT}")
for v in TOKEN TEST_USER_FREE TEST_PASSWORD_FREE TEST_USER_PRO TEST_PASSWORD_PRO; do
  if [ -n "${!v:-}" ]; then ENV_ARGS+=(-e "$v=${!v}"); fi
done

# --- Basic sanity checks ---
if [ ! -d "$MOUNT_LOCAL" ]; then
  echo "Tests folder not found: $MOUNT_LOCAL"
  exit 1
fi

# --- Run a single tier (smoke|load|stress|spike) ---
run_test () {
  local tier="$1"
  local file="$WORKDIR_IN/performance/$tier/booking.js"
  echo "==> Running $tier ($file) against BASE_URL=${BASE_URL_DEFAULT}"
  docker run -i --rm \
    ${DOCKER_EXTRA+"${DOCKER_EXTRA[@]}"} \
    -v "$MOUNT_LOCAL":"$WORKDIR_IN" -w "$WORKDIR_IN" \
    "${ENV_ARGS[@]}" \
    "$K6_IMAGE" run "$file"
}

# --- Simple interactive menu ---
menu () {
  echo "Select a test:"
  echo "  1) smoke"
  echo "  2) load"
  echo "  3) stress"
  echo "  4) spike"
  echo "  5) all"
  echo "  0) exit"
  read -rp "> " opt
  case "$opt" in
    1) run_test smoke ;;
    2) run_test load ;;
    3) run_test stress ;;
    4) run_test spike ;;
    5) run_test smoke; run_test load; run_test stress; run_test spike ;;
    0) exit 0 ;;
    *) echo "invalid option"; exit 1 ;;
  esac
}

# --- CLI: ./run-k6-local.sh [smoke|load|stress|spike|all] ---
cmd="${1:-menu}"
case "$cmd" in
  smoke|load|stress|spike) run_test "$cmd" ;;
  all) run_test smoke; run_test load; run_test stress; run_test spike ;;
  menu) menu ;;
  *) echo "Usage: $0 [smoke|load|stress|spike|all]"; exit 1 ;;
esac
