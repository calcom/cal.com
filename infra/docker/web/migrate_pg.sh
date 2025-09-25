#!/bin/bash

set -e

# Usage message
usage() {
  echo "Usage: $0 <SOURCE_DB_URL> <TARGET_DB_URL> [OPTIONS]"
  echo "Example: $0 postgres://user:pass@source_host:5432/sourcedb postgres://user:pass@target_host:5432/targetdb"
  echo ""
  echo "Options:"
  echo "  --data-only     Only migrate data (no schema)"
  echo "  --schema-only   Only migrate schema (no data)"
  echo "  --skip-config   Skip configuration parameters that might cause conflicts"
  exit 1
}

# Parse arguments
SOURCE_DB_URL=""
TARGET_DB_URL=""
DATA_ONLY=false
SCHEMA_ONLY=false
SKIP_CONFIG=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --data-only)
      DATA_ONLY=true
      shift
      ;;
    --schema-only)
      SCHEMA_ONLY=true
      shift
      ;;
    --skip-config)
      SKIP_CONFIG=true
      shift
      ;;
    --help|-h)
      usage
      ;;
    *)
      if [ -z "$SOURCE_DB_URL" ]; then
        SOURCE_DB_URL="$1"
      elif [ -z "$TARGET_DB_URL" ]; then
        TARGET_DB_URL="$1"
      else
        echo "❌ ERROR: Too many arguments"
        usage
      fi
      shift
      ;;
  esac
done

# Validate input
if [ -z "$SOURCE_DB_URL" ] || [ -z "$TARGET_DB_URL" ]; then
  usage
fi

check_connection() {
  local DB_URL=$1
  if PGPASSWORD=$(echo "$DB_URL" | sed -E 's/.*\/\/[^:]+:([^@]+)@.*/\1/') \
     psql "$DB_URL" -c '\q' &> /dev/null; then
    echo "✅ Connection to $DB_URL successful."
  else
    echo "❌ ERROR: Could not connect to $DB_URL"
    exit 1
  fi
}

# Check database versions
check_versions() {
  echo "🔍 Checking database versions..."
  
  SOURCE_VERSION=$(PGPASSWORD=$(echo "$SOURCE_DB_URL" | sed -E 's/.*\/\/[^:]+:([^@]+)@.*/\1/') \
    psql "$SOURCE_DB_URL" -t -c "SELECT version();" | head -1 | sed 's/^ *//')
  
  TARGET_VERSION=$(PGPASSWORD=$(echo "$TARGET_DB_URL" | sed -E 's/.*\/\/[^:]+:([^@]+)@.*/\1/') \
    psql "$TARGET_DB_URL" -t -c "SELECT version();" | head -1 | sed 's/^ *//')
  
  echo "Source DB: $SOURCE_VERSION"
  echo "Target DB: $TARGET_VERSION"
}

check_connection "$SOURCE_DB_URL"
check_connection "$TARGET_DB_URL"
check_versions

# Create a temporary file
DUMP_FILE_PATH="/tmp/db_dump_XXXXXX.dump"
rm -rf "$DUMP_FILE_PATH" 2>/dev/null || true
DUMP_FILE=$(mktemp "$DUMP_FILE_PATH")

START_TIME=$(date +%s)

# Build pg_dump options
DUMP_OPTIONS="-F c --no-unlogged-table-data --no-comments"

if [ "$SCHEMA_ONLY" = true ]; then
  DUMP_OPTIONS="$DUMP_OPTIONS --schema-only"
elif [ "$DATA_ONLY" = true ]; then
  DUMP_OPTIONS="$DUMP_OPTIONS --data-only"
fi

if [ "$SKIP_CONFIG" = true ]; then
  DUMP_OPTIONS="$DUMP_OPTIONS --no-privileges --no-tablespaces"
fi

echo "📦 Backing up source database to $DUMP_FILE..."
echo "Using options: $DUMP_OPTIONS"
pg_dump "$SOURCE_DB_URL" $DUMP_OPTIONS -f "$DUMP_FILE"

# Build pg_restore options
RESTORE_OPTIONS="--clean --no-owner --if-exists"

if [ "$SKIP_CONFIG" = true ]; then
  RESTORE_OPTIONS="$RESTORE_OPTIONS --no-privileges --no-tablespaces"
fi

echo "📥 Restoring into target database..."
echo "Using options: $RESTORE_OPTIONS"

# Try restore with error handling
if ! pg_restore $RESTORE_OPTIONS --dbname="$TARGET_DB_URL" "$DUMP_FILE" 2>&1 | tee /tmp/restore.log; then
  echo "⚠️  Restore completed with warnings/errors. Check the log above."
  
  # Check for specific configuration parameter errors
  if grep -q "unrecognized configuration parameter" /tmp/restore.log; then
    echo ""
    echo "🔧 Configuration parameter errors detected. Trying alternative approach..."
    
    # Alternative: Use plain text dump and filter out problematic SET commands
    PLAIN_DUMP_FILE=$(mktemp /tmp/db_dump_plain_XXXXXX.sql)
    
    echo "📦 Creating plain text dump..."
    pg_dump "$SOURCE_DB_URL" --no-unlogged-table-data --no-comments -f "$PLAIN_DUMP_FILE"
    
    # Filter out problematic configuration parameters
    FILTERED_DUMP_FILE=$(mktemp /tmp/db_dump_filtered_XXXXXX.sql)
    
    echo "🔧 Filtering out problematic configuration parameters..."
    grep -v -E "^SET (transaction_timeout|lock_timeout|statement_timeout|idle_in_transaction_session_timeout)" "$PLAIN_DUMP_FILE" > "$FILTERED_DUMP_FILE" || true
    
    echo "📥 Restoring filtered dump..."
    PGPASSWORD=$(echo "$TARGET_DB_URL" | sed -E 's/.*\/\/[^:]+:([^@]+)@.*/\1/') \
      psql "$TARGET_DB_URL" -f "$FILTERED_DUMP_FILE"
    
    # Cleanup
    rm -f "$PLAIN_DUMP_FILE" "$FILTERED_DUMP_FILE"
    echo "✅ Migration completed using filtered approach."
  fi
else
  echo "✅ Restore completed successfully."
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "🧹 Cleaning up..."
rm -f "$DUMP_FILE"
rm -f /tmp/restore.log 2>/dev/null || true

echo "✅ Migration complete in $DURATION seconds."