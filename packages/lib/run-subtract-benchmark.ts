#!/usr/bin/env ts-node
import { runSubtractPerformanceBenchmark } from "./date-ranges-subtract-benchmark";

console.log("Starting subtract function performance benchmark...\n");

runSubtractPerformanceBenchmark();

console.log("\nBenchmark completed successfully!");
