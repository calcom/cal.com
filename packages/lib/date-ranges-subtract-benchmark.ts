import dayjs from "@calcom/dayjs";

import { subtract } from "./date-ranges";
import type { DateRange } from "./date-ranges";

/**
 * Performance benchmark for the subtract function comparing UTC vs non-UTC dayjs modes
 *
 * This benchmark tests the performance difference between:
 * 1. Dayjs objects in UTC mode (.utc())
 * 2. Dayjs objects in timezone mode (.tz("America/New_York"))
 *
 * The subtract function uses dayjs methods like .isBefore(), .isAfter() which may have
 * different performance characteristics in different modes.
 */

const TIMEZONE = "America/New_York"; // Common timezone with DST for testing
const ITERATIONS = 100; // Number of times to run each test
const SOURCE_RANGES_COUNT = 1000; // Substantial input size
const EXCLUDED_RANGES_COUNT = 500; // Substantial input size

function createUTCDateRanges(count: number, startDate: string, offsetHours: number): DateRange[] {
  const ranges: DateRange[] = [];
  const baseDate = dayjs.utc(startDate);

  for (let i = 0; i < count; i++) {
    const start = baseDate.add(i * 2 + offsetHours, "hour");
    const end = start.add(1, "hour");
    ranges.push({ start, end });
  }

  return ranges;
}

function createTimezoneeDateRanges(
  count: number,
  startDate: string,
  offsetHours: number,
  timezone: string
): DateRange[] {
  const ranges: DateRange[] = [];
  const baseDate = dayjs(startDate).tz(timezone);

  for (let i = 0; i < count; i++) {
    const start = baseDate.add(i * 2 + offsetHours, "hour");
    const end = start.add(1, "hour");
    ranges.push({ start, end });
  }

  return ranges;
}

function runPerformanceTest(
  testName: string,
  sourceRanges: DateRange[],
  excludedRanges: DateRange[],
  iterations: number
): { executionTime: number; result: DateRange[] } {
  const startTime = performance.now();
  let result: DateRange[] = [];

  for (let i = 0; i < iterations; i++) {
    result = subtract(sourceRanges, excludedRanges);
  }

  const endTime = performance.now();
  const executionTime = endTime - startTime;

  console.log(`${testName}:`);
  console.log(`  - Total execution time: ${executionTime.toFixed(2)}ms`);
  console.log(`  - Average per iteration: ${(executionTime / iterations).toFixed(2)}ms`);
  console.log(
    `  - Processed ${sourceRanges.length} source ranges and ${excludedRanges.length} excluded ranges`
  );
  console.log(`  - Result: ${result.length} remaining ranges`);

  return { executionTime, result };
}

function verifyResultsIdentical(utcResult: DateRange[], timezoneResult: DateRange[]): boolean {
  if (utcResult.length !== timezoneResult.length) {
    return false;
  }

  for (let i = 0; i < utcResult.length; i++) {
    const utcRange = utcResult[i];
    const timezoneRange = timezoneResult[i];

    if (
      utcRange.start.valueOf() !== timezoneRange.start.valueOf() ||
      utcRange.end.valueOf() !== timezoneRange.end.valueOf()
    ) {
      return false;
    }
  }

  return true;
}

export function runSubtractPerformanceBenchmark(): void {
  console.log("=".repeat(80));
  console.log("SUBTRACT FUNCTION PERFORMANCE BENCHMARK: UTC vs Non-UTC Dayjs Modes");
  console.log("=".repeat(80));
  console.log(`Configuration:`);
  console.log(`  - Source ranges: ${SOURCE_RANGES_COUNT}`);
  console.log(`  - Excluded ranges: ${EXCLUDED_RANGES_COUNT}`);
  console.log(`  - Iterations per test: ${ITERATIONS}`);
  console.log(`  - Timezone for non-UTC test: ${TIMEZONE}`);
  console.log("");

  console.log("1. UTC MODE TEST");
  console.log("-".repeat(40));
  const utcSourceRanges = createUTCDateRanges(SOURCE_RANGES_COUNT, "2024-01-01T00:00:00Z", 0);
  const utcExcludedRanges = createUTCDateRanges(EXCLUDED_RANGES_COUNT, "2024-01-01T02:00:00Z", 1);

  const utcTest = runPerformanceTest("UTC Mode Performance", utcSourceRanges, utcExcludedRanges, ITERATIONS);

  console.log("");

  console.log("2. TIMEZONE MODE TEST");
  console.log("-".repeat(40));
  const timezoneSourceRanges = createTimezoneeDateRanges(
    SOURCE_RANGES_COUNT,
    "2024-01-01T00:00:00",
    0,
    TIMEZONE
  );
  const timezoneExcludedRanges = createTimezoneeDateRanges(
    EXCLUDED_RANGES_COUNT,
    "2024-01-01T02:00:00",
    1,
    TIMEZONE
  );

  const timezoneTest = runPerformanceTest(
    "Timezone Mode Performance",
    timezoneSourceRanges,
    timezoneExcludedRanges,
    ITERATIONS
  );

  console.log("");

  console.log("3. CORRECTNESS VERIFICATION");
  console.log("-".repeat(40));

  const smallUtcSource = createUTCDateRanges(10, "2024-01-01T00:00:00Z", 0);
  const smallUtcExcluded = createUTCDateRanges(5, "2024-01-01T02:00:00Z", 1);
  const smallTimezoneSource = createTimezoneeDateRanges(10, "2024-01-01T00:00:00", 0, TIMEZONE);
  const smallTimezoneExcluded = createTimezoneeDateRanges(5, "2024-01-01T02:00:00", 1, TIMEZONE);

  const utcCorrectness = subtract(smallUtcSource, smallUtcExcluded);
  const timezoneCorrectness = subtract(smallTimezoneSource, smallTimezoneExcluded);

  const resultsIdentical = verifyResultsIdentical(utcCorrectness, timezoneCorrectness);

  console.log(`Correctness verification: ${resultsIdentical ? "PASSED" : "FAILED"}`);
  console.log(`UTC result count: ${utcCorrectness.length}`);
  console.log(`Timezone result count: ${timezoneCorrectness.length}`);

  if (!resultsIdentical) {
    console.log("WARNING: Results are not identical between UTC and timezone modes!");
  }

  console.log("");

  console.log("4. PERFORMANCE COMPARISON");
  console.log("-".repeat(40));

  const speedRatio = utcTest.executionTime / timezoneTest.executionTime;
  const fasterMode = speedRatio > 1 ? "Timezone" : "UTC";
  const performanceDifference = Math.abs(speedRatio - 1) * 100;

  console.log(`UTC Mode: ${utcTest.executionTime.toFixed(2)}ms total`);
  console.log(`Timezone Mode: ${timezoneTest.executionTime.toFixed(2)}ms total`);
  console.log(`Speed ratio (UTC/Timezone): ${speedRatio.toFixed(2)}x`);
  console.log(`${fasterMode} mode is ${performanceDifference.toFixed(1)}% faster`);

  if (performanceDifference > 10) {
    console.log(`⚠️  Significant performance difference detected (>${performanceDifference.toFixed(1)}%)`);
  } else {
    console.log(`✅ Performance difference is minimal (<10%)`);
  }

  console.log("");
  console.log("=".repeat(80));
  console.log("BENCHMARK COMPLETE");
  console.log("=".repeat(80));
}

if (require.main === module) {
  runSubtractPerformanceBenchmark();
}
