/**
 * @file test-daily-connection.ts
 * @description Local test script to verify the DAILY_API_KEY is valid and the
 * Daily.co domain is reachable. Read-only — does not modify any settings.
 *
 * Usage:
 *   npx ts-node scratch/test-daily-connection.ts
 *
 * Prerequisites:
 *   - DAILY_API_KEY must be set in .env at the repo root
 */

import { config } from "dotenv";
import { z } from "zod";

config({ path: ".env" });

/**
 * Zod schema for the subset of the Daily.co domain configuration response
 * that we care about for connection verification.
 */
const DailyDomainResponseSchema = z.object({
  domain_name: z.string(),
  config: z
    .object({
      enable_transcription: z.unknown().optional(),
    })
    .passthrough(),
});

type DailyDomainResponse = z.infer<typeof DailyDomainResponseSchema>;

/**
 * Fetches the Daily.co domain configuration using the provided API key.
 * This is a read-only GET request that verifies connectivity and key validity.
 */
async function fetchDailyDomainConfig(apiKey: string): Promise<DailyDomainResponse> {
  const response = await fetch("https://api.daily.co/v1/", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Daily API returned HTTP ${response.status}: ${errorText}`
    );
  }

  const json: unknown = await response.json();
  return DailyDomainResponseSchema.parse(json);
}

/**
 * Main entry point. Reads the API key from .env, tests the connection,
 * and logs the result with a clear success or failure message.
 */
async function main(): Promise<void> {
  const apiKey = process.env.DAILY_API_KEY;

  if (!apiKey) {
    console.error("❌ DAILY_API_KEY is not set in .env");
    console.error("   Add DAILY_API_KEY=dk_xxxxxxxx to your .env file and try again.");
    process.exit(1);
  }

  console.log("🔍 Testing Daily.co API connection...\n");

  try {
    const domainConfig = await fetchDailyDomainConfig(apiKey);

    const transcriptionStatus = domainConfig.config.enable_transcription;

    console.log("✅ Connection successful!\n");
    console.log(`   Domain name:            ${domainConfig.domain_name}`);
    console.log(
      `   enable_transcription:   ${transcriptionStatus !== undefined ? String(transcriptionStatus) : "not set"}`
    );
    console.log("\n🎉 Your DAILY_API_KEY is valid and the domain is reachable.");
    process.exit(0);
  } catch (error: unknown) {
    console.error("❌ Connection failed!\n");
    if (error instanceof Error) {
      console.error(`   Error: ${error.message}`);
    } else {
      console.error(`   Error: ${String(error)}`);
    }
    console.error("\n   Check that your DAILY_API_KEY is correct and not expired.");
    process.exit(1);
  }
}

main();
