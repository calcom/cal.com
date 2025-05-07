
export NODE_ENV=production
export TZ=UTC

echo "Running benchmark for getAvailableSlots function"
echo "================================================"
echo "Original implementation (before optimization):"
echo "Run this benchmark on the main branch"
echo ""
echo "Optimized implementation:"
node -r ts-node/register ./packages/trpc/server/routers/viewer/slots/benchmark.ts
