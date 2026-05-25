#!/usr/bin/env bash
set -euo pipefail

preview_url="${JOURNAL_PUBLIC_API_URL:-${JOURNAL_BUILD_PUBLIC_URL:-}}"

if [[ -z "$preview_url" ]]; then
  echo "[calcom-preview-env] Journal preview URL not set; skipping overrides"
  return 0 2>/dev/null || exit 0
fi

export NEXT_PUBLIC_WEBAPP_URL="$preview_url"
export NEXTAUTH_URL="$preview_url/api/auth"

upsert_env_var() {
  local key="$1"
  local value="$2"
  local target_file="$3"
  local tmp_file

  mkdir -p "$(dirname "$target_file")"
  tmp_file="$(mktemp)"

  if [[ -f "$target_file" ]]; then
    grep -v -E "^${key}=" "$target_file" > "$tmp_file" || true
  fi

  printf '%s="%s"\n' "$key" "$value" >> "$tmp_file"
  mv "$tmp_file" "$target_file"
}

if [[ -w "." ]]; then
  upsert_env_var "NEXT_PUBLIC_WEBAPP_URL" "$NEXT_PUBLIC_WEBAPP_URL" ".env.local"
  upsert_env_var "NEXTAUTH_URL" "$NEXTAUTH_URL" ".env.local"
  echo "[calcom-preview-env] Applied Journal preview URL overrides"
fi
