#!/bin/bash
# Benchmark dev server start time

echo "========================================="
echo "Cal.com Dev Server Benchmark"
echo "========================================="
echo ""
echo "Starting dev server..."
echo "Measuring time until 'compiled successfully' appears"
echo ""

# Start timing
START=$(date +%s%N)

# Start dev server in background and capture output
yarn dev 2>&1 | while IFS= read -r line
do
  echo "$line"

  # Check if compilation is complete
  if [[ "$line" == *"compiled successfully"* ]] || [[ "$line" == *"ready"* ]]; then
    # End timing
    END=$(date +%s%N)

    # Calculate duration in milliseconds
    DURATION=$(( (END - START) / 1000000 ))
    SECONDS=$(( DURATION / 1000 ))
    MS=$(( DURATION % 1000 ))

    echo ""
    echo "========================================="
    echo "✅ DEV SERVER READY"
    echo "========================================="
    echo "Time: ${SECONDS}.${MS}s (${DURATION}ms)"
    echo ""

    # Save to benchmark file
    TIMESTAMP=$(date +%Y-%m-%d\ %H:%M:%S)
    echo "{\"timestamp\": \"$TIMESTAMP\", \"duration_ms\": $DURATION, \"duration_s\": \"${SECONDS}.${MS}s\"}" >> ../.swarm/benchmarks/layer1.json

    # Kill the dev server
    pkill -P $$ yarn
    pkill -P $$ node

    break
  fi
done

echo ""
echo "Benchmark saved to .swarm/benchmarks/layer1.json"
echo ""
