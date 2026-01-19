#!/bin/bash

# Export all Devin Knowledge to a backup JSON file
# Usage: DEVIN_API_TOKEN=your_token ./export-devin-knowledge.sh
# Or: ./export-devin-knowledge.sh (if DEVIN_API_TOKEN is already set in environment)

set -e

# Check for API token
if [ -z "$DEVIN_API_TOKEN" ]; then
    echo "Error: DEVIN_API_TOKEN environment variable is not set"
    echo "Usage: DEVIN_API_TOKEN=your_token ./export-devin-knowledge.sh"
    echo ""
    echo "Get your API token from: https://app.devin.ai/settings/api-keys"
    exit 1
fi

# Generate backup filename with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="devin-knowledge-backup-${TIMESTAMP}.json"

echo "Exporting Devin Knowledge..."

# Call the Devin Knowledge API
HTTP_RESPONSE=$(curl -s -w "\n%{http_code}" \
    --request GET \
    --url "https://api.devin.ai/v1/knowledge" \
    --header "Authorization: Bearer ${DEVIN_API_TOKEN}" \
    --header "Content-Type: application/json")

# Extract HTTP status code (last line)
HTTP_STATUS=$(echo "$HTTP_RESPONSE" | tail -n 1)
# Extract response body (everything except last line)
RESPONSE_BODY=$(echo "$HTTP_RESPONSE" | sed '$d')

if [ "$HTTP_STATUS" -eq 200 ]; then
    # Pretty print the JSON and save to file
    echo "$RESPONSE_BODY" | jq '.' > "$BACKUP_FILE"
    
    # Count entries
    FOLDER_COUNT=$(echo "$RESPONSE_BODY" | jq '.folders | length')
    KNOWLEDGE_COUNT=$(echo "$RESPONSE_BODY" | jq '.knowledge | length')
    
    echo "Success! Backup saved to: $BACKUP_FILE"
    echo "  - Folders: $FOLDER_COUNT"
    echo "  - Knowledge entries: $KNOWLEDGE_COUNT"
else
    echo "Error: API request failed with status $HTTP_STATUS"
    echo "Response: $RESPONSE_BODY"
    exit 1
fi
