#!/usr/bin/env npx tsx
/**
 * Interactive seed script launcher for billing test data.
 *
 * Usage:
 *   npx tsx packages/features/ee/billing/seed.ts
 *
 * Non-interactive (CI-friendly):
 *   npx tsx packages/features/ee/billing/seed.ts --hwm
 *   npx tsx packages/features/ee/billing/seed.ts --proration
 *   npx tsx packages/features/ee/billing/seed.ts --active-user
 *   npx tsx packages/features/ee/billing/seed.ts --resubscribe
 *   npx tsx packages/features/ee/billing/seed.ts --all
 *   npx tsx packages/features/ee/billing/seed.ts --cleanup
 *
 * Flags (combinable with above):
 *   --skip-stripe       Skip Stripe API calls (use fake IDs)
 *   --cleanup           Clean up before seeding
 *   --min-seats <N>     Set minSeats floor for active-user billing
 */

import { spawn } from "node:child_process";
import * as readline from "node:readline";

const HWM_SCRIPT =
  "packages/features/ee/billing/service/highWaterMark/seed-hwm-test.ts";
const PRORATION_SCRIPT =
  "packages/features/ee/billing/service/dueInvoice/seed-proration-test.ts";
const ACTIVE_USER_SCRIPT =
  "packages/features/ee/billing/active-user/seed-active-user-test.ts";
const RESUBSCRIBE_SCRIPT =
  "packages/features/ee/billing/service/dunning/seed-resubscribe-test.ts";

const passthrough = process.argv.filter((a) => a === "--skip-stripe");

function parseMinSeatsFromArgs(): number | null {
  const idx = process.argv.indexOf("--min-seats");
  if (idx === -1) return null;
  const val = parseInt(process.argv[idx + 1], 10);
  if (Number.isNaN(val) || val < 1) return null;
  return val;
}

function run(script: string, extraArgs: string[] = []): Promise<number> {
  const args = ["tsx", script, ...passthrough, ...extraArgs];
  return new Promise((resolve) => {
    const child = spawn("npx", args, { stdio: "inherit", shell: true });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function seedHwm(cleanup: boolean) {
  console.log("\n--- Seeding High Water Mark test data ---\n");
  const extra = cleanup ? ["--cleanup"] : [];
  return run(HWM_SCRIPT, extra);
}

async function seedProration(cleanup: boolean) {
  console.log("\n--- Seeding Proration test data ---\n");
  const extra = cleanup ? ["--cleanup"] : [];
  return run(PRORATION_SCRIPT, extra);
}

async function seedActiveUser(cleanup: boolean, minSeats?: number | null) {
  console.log("\n--- Seeding Active User Billing test data ---\n");
  const extra = cleanup ? ["--cleanup"] : [];
  if (minSeats) extra.push("--min-seats", String(minSeats));
  return run(ACTIVE_USER_SCRIPT, extra);
}

async function seedResubscribe(cleanup: boolean) {
  console.log("\n--- Seeding Resubscribe test data ---\n");
  const extra = cleanup ? ["--cleanup"] : [];
  return run(RESUBSCRIBE_SCRIPT, extra);
}

async function seedAll(cleanup: boolean) {
  let code = await seedHwm(cleanup);
  if (code !== 0) return code;
  code = await seedProration(cleanup);
  if (code !== 0) return code;
  code = await seedActiveUser(cleanup);
  if (code !== 0) return code;
  code = await seedResubscribe(cleanup);
  return code;
}

async function cleanupAll() {
  console.log("\n--- Cleaning up all billing test data ---\n");
  let code = await run(HWM_SCRIPT, ["--cleanup", "--skip-stripe"]);
  if (code !== 0) return code;
  code = await run(PRORATION_SCRIPT, ["--cleanup", "--skip-stripe"]);
  if (code !== 0) return code;
  code = await run(ACTIVE_USER_SCRIPT, ["--cleanup", "--skip-stripe"]);
  if (code !== 0) return code;
  code = await run(RESUBSCRIBE_SCRIPT, ["--cleanup", "--skip-stripe"]);
  return code;
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function interactive() {
  console.log("=== Billing Test Data Seeder ===\n");
  console.log("  1) Seed HWM (High Water Mark) test data");
  console.log("  2) Seed Proration test data");
  console.log("  3) Seed Active User Billing test data");
  console.log("  4) Seed Resubscribe test data");
  console.log("  5) Seed all");
  console.log("  6) Cleanup all test data");
  console.log("  q) Quit\n");

  const choice = await prompt("Choose [1-6, q]: ");

  if (choice === "q" || choice === "") {
    console.log("Bye.");
    return;
  }

  let cleanup = false;
  if (["1", "2", "3", "4", "5"].includes(choice)) {
    const ans = await prompt("Run cleanup before seeding? [y/N]: ");
    cleanup = ans.toLowerCase() === "y";
  }

  let minSeats: number | null = null;
  if (choice === "3") {
    const ans = await prompt("Set minSeats floor? (enter a number, or leave blank for none): ");
    if (ans !== "") {
      const parsed = parseInt(ans, 10);
      if (Number.isNaN(parsed) || parsed < 1) {
        console.log("Invalid minSeats value, must be a positive integer.");
        process.exit(1);
      }
      minSeats = parsed;
    }
  }

  let code = 0;
  switch (choice) {
    case "1":
      code = await seedHwm(cleanup);
      break;
    case "2":
      code = await seedProration(cleanup);
      break;
    case "3":
      code = await seedActiveUser(cleanup, minSeats);
      break;
    case "4":
      code = await seedResubscribe(cleanup);
      break;
    case "5":
      code = await seedAll(cleanup);
      break;
    case "6":
      code = await cleanupAll();
      break;
    default:
      console.log(`Unknown option: ${choice}`);
      code = 1;
  }

  process.exit(code);
}

async function main() {
  const args = process.argv
    .slice(2)
    .filter((a) => !a.startsWith("--skip-stripe"));

  if (args.includes("--hwm")) {
    process.exit(await seedHwm(args.includes("--cleanup")));
  }
  if (args.includes("--proration")) {
    process.exit(await seedProration(args.includes("--cleanup")));
  }
  if (args.includes("--active-user")) {
    process.exit(await seedActiveUser(args.includes("--cleanup"), parseMinSeatsFromArgs()));
  }
  if (args.includes("--resubscribe")) {
    process.exit(await seedResubscribe(args.includes("--cleanup")));
  }
  if (args.includes("--all")) {
    process.exit(await seedAll(args.includes("--cleanup")));
  }
  if (
    args.includes("--cleanup") &&
    !args.includes("--hwm") &&
    !args.includes("--proration") &&
    !args.includes("--active-user") &&
    !args.includes("--resubscribe") &&
    !args.includes("--all")
  ) {
    process.exit(await cleanupAll());
  }

  await interactive();
}

main();
