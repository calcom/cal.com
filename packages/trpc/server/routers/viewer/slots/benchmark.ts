import { IncomingMessage } from "http";
import { Socket } from "net";
import { performance } from "perf_hooks";

import dayjs from "@calcom/dayjs";
import { PrismaClient } from "@calcom/prisma/client";

import { TRPCError } from "@trpc/server";

import type { ContextForGetSchedule } from "./types";
import { getAvailableSlots } from "./util";

const prisma = new PrismaClient();

class MockIncomingMessage extends IncomingMessage {
  cookies: Partial<{ [key: string]: string }>;

  constructor() {
    super(new Socket());
    this.cookies = { uid: "test-uid" };
  }
}

async function runBenchmark() {
  console.log("Starting benchmark for getAvailableSlots function");

  const sampleInput = {
    eventTypeId: 1, // Replace with a valid event type ID
    startTime: dayjs().add(1, "day").startOf("day").toISOString(),
    endTime: dayjs().add(30, "day").endOf("day").toISOString(),
    timeZone: "UTC",
    usernameList: ["pro"], // Replace with a valid username
    debug: true,
    isTeamEvent: false, // Required field
  };

  const ctx: ContextForGetSchedule = {
    prisma,
    req: new MockIncomingMessage(),
  };

  try {
    await getAvailableSlots({ input: sampleInput, ctx });
    console.log("Warm-up run completed");
  } catch (error) {
    if (error instanceof TRPCError) {
      console.error(`Warm-up error: ${error.code} - ${error.message}`);
    } else {
      console.error("Warm-up error:", error);
    }
    return;
  }

  const iterations = 5;
  const results = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();

    try {
      await getAvailableSlots({ input: sampleInput, ctx });
      const end = performance.now();
      const duration = end - start;
      results.push(duration);
      console.log(`Run ${i + 1}: ${duration.toFixed(2)}ms`);
    } catch (error) {
      if (error instanceof TRPCError) {
        console.error(`Run ${i + 1} error: ${error.code} - ${error.message}`);
      } else {
        console.error(`Run ${i + 1} error:`, error);
      }
    }
  }

  if (results.length > 0) {
    const average = results.reduce((sum, time) => sum + time, 0) / results.length;
    const min = Math.min(...results);
    const max = Math.max(...results);

    console.log("\nBenchmark Results:");
    console.log(`Average execution time: ${average.toFixed(2)}ms`);
    console.log(`Min execution time: ${min.toFixed(2)}ms`);
    console.log(`Max execution time: ${max.toFixed(2)}ms`);
  } else {
    console.log("No successful benchmark runs");
  }
}

runBenchmark()
  .then(() => {
    console.log("Benchmark completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Benchmark failed:", error);
    process.exit(1);
  });
