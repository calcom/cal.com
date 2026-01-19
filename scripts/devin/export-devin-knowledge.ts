#!/usr/bin/env -S npx tsx

/**
 * Export all Devin Knowledge to a backup JSON file
 * Usage: DEVIN_API_KEY=your_token npx tsx scripts/devin/export-devin-knowledge.ts
 */

import process from "node:process";
import * as fs from "fs";
import * as path from "path";

const API_BASE = "https://api.devin.ai/v1";

interface ApiFolder {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

interface ApiKnowledgeEntry {
  id: string;
  name: string;
  body: string;
  trigger_description: string;
  created_at: string;
  created_by?: {
    full_name: string;
    id: string;
  };
  parent_folder_id?: string;
}

interface ApiListResponse {
  folders: ApiFolder[];
  knowledge: ApiKnowledgeEntry[];
}

async function main() {
  const token = process.env.DEVIN_API_KEY;
  if (!token) {
    console.error("Error: DEVIN_API_KEY environment variable is not set");
    console.error("Usage: DEVIN_API_KEY=your_token npx tsx scripts/devin/export-devin-knowledge.ts");
    console.error("");
    console.error("Get your API token from: https://app.devin.ai/settings/api-keys");
    process.exit(1);
  }

  console.log("Exporting Devin Knowledge...");

  const response = await fetch(`${API_BASE}/knowledge`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Error: API request failed with status ${response.status}`);
    console.error(`Response: ${errorText}`);
    process.exit(1);
  }

  const data: ApiListResponse = await response.json();

  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "_").slice(0, 15);
  const backupFile = `devin-knowledge-backup-${timestamp}.json`;
  const outputPath = path.join(process.cwd(), backupFile);

  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

  console.log(`Success! Backup saved to: ${backupFile}`);
  console.log(`  - Folders: ${data.folders.length}`);
  console.log(`  - Knowledge entries: ${data.knowledge.length}`);
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
