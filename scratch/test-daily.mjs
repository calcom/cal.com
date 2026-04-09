import process from "node:process";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env manually
const envFile = readFileSync(resolve(process.cwd(), ".env"), "utf8");
const envVars = Object.fromEntries(
  envFile
    .split("\n")
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const [key, ...rest] = line.split("=");
      return [key.trim(), rest.join("=").trim()];
    })
);

const key = envVars.DAILY_API_KEY || process.env.DAILY_API_KEY;

if (!key) {
  console.error("❌ DAILY_API_KEY not set in .env");
  process.exit(1);
}

console.log("🔄 Testing Daily.co connection...");
console.log(`   Using key ending in: ...${key.slice(-6)}`);

fetch("https://api.daily.co/v1/", {
  headers: { Authorization: `Bearer ${key}` },
})
  .then((r) => r.json())
  .then((d) => {
    console.log("✅ Connected successfully");
    console.log("   Domain:", d.domain_name ?? "unknown");
    console.log("   Transcription:", d.config?.enable_transcription ?? "⚠️  not enabled");
  })
  .catch((e) => {
    console.error("❌ Network error:", e.message);
    process.exit(1);
  });
