import { execSync } from "child_process";
import prisma from "@calcom/prisma";

/**
 * This script runs all seed scripts in sequence:
 * 1. seed.ts - Main seed script
 * 2. seed-insights.ts - Insights data
 * 3. seed-pbac-organization.ts - PBAC organization
 */

async function runSeedAll() {
  console.log("🌱 Starting seed-all process...\n");

  try {
    await prisma.$connect();

    console.log("📦 Running main seed script (seed.ts)...");
    execSync("ts-node --transpile-only ./scripts/seed.ts", {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    console.log("✅ Main seed completed\n");

    console.log("📊 Running insights seed script (seed-insights.ts)...");
    execSync("ts-node --transpile-only ./scripts/seed-insights.ts", {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    console.log("✅ Insights seed completed\n");

    console.log("🔐 Running PBAC organization seed script (seed-pbac-organization.ts)...");
    execSync("ts-node --transpile-only ./scripts/seed-pbac-organization.ts", {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    console.log("✅ PBAC organization seed completed\n");

    console.log("🎉 All seed scripts completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error running seed scripts:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runSeedAll();
