#!/bin/bash

# Configuration
LOG_FILE="/tmp/tmole.log"
ENV_FILE="../.env"
TM_PORT=3000
TM_KEYWORD="https://.*\.tunnelmole\.net"
TMOLE_RUNNING=$(pgrep -f "tmole $TM_PORT")

# Clean exit function
cleanup() {
  if [ "$OWNED_PID" = true ]; then
    echo -e "\nStopping Tunnelmole (PID: $TMOLE_PID)..."
    kill "$TMOLE_PID" 2>/dev/null
    wait "$TMOLE_PID" 2>/dev/null
  fi
  exit 0
}

trap cleanup SIGINT SIGTERM

# Function to extract URL from log
extract_url_from_log() {
  grep -oE "$TM_KEYWORD" "$LOG_FILE" | head -n 1
}

# If tmole is already running
if [ -n "$TMOLE_RUNNING" ]; then
  echo "Tunnelmole already running (PID: $TMOLE_RUNNING), reusing..."
  TUNNEL_URL=$(extract_url_from_log)
  OWNED_PID=false
else
  echo "Starting a new Tunnelmole session..."
  rm -f "$LOG_FILE"
  tmole $TM_PORT > "$LOG_FILE" 2>&1 &
  TMOLE_PID=$!
  OWNED_PID=true

  # Wait for URL or error
  echo "Waiting for tmole to initialize..."
  for i in {1..20}; do
    if grep -q "$TM_KEYWORD" "$LOG_FILE"; then
      TUNNEL_URL=$(extract_url_from_log)
      break
    fi
    if grep -q "limited to 10 tunnels per hour" "$LOG_FILE"; then
      echo "❌ Rate limit hit: You've used your 10 free tunnels/hour. Sign up at:"
      echo "👉 https://dashboard.tunnelmole.com/upgrade/run-more-tunnels-faster"
      cleanup
    fi
    sleep 0.5
  done
fi

# Check that we actually got a URL
if [ -z "$TUNNEL_URL" ]; then
  echo "❌ Failed to extract Tunnelmole URL."
  cleanup
fi

# Update env file
if [ ! -f "$ENV_FILE" ]; then
  echo "⚠️  $ENV_FILE not found. Creating new file."
  touch "$ENV_FILE"
fi

if grep -q '^GOOGLE_WEBHOOK_URL=' "$ENV_FILE"; then
  sed -i '' -E "s|^GOOGLE_WEBHOOK_URL=.*|GOOGLE_WEBHOOK_URL=$TUNNEL_URL|" "$ENV_FILE"
else
  echo "GOOGLE_WEBHOOK_URL=$TUNNEL_URL" >> "$ENV_FILE"
fi

echo "✅ Updated GOOGLE_WEBHOOK_URL in $ENV_FILE to $TUNNEL_URL"
echo "Tunnelmole is running. Press Ctrl+C to stop."

# Keep script alive only if we started tmole
if [ "$OWNED_PID" = true ]; then
  wait "$TMOLE_PID"
fi
