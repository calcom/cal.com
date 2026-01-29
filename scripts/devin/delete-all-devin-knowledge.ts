#!/usr/bin/env -S npx tsx

/**
 * Deletes ALL knowledge entries from Devin's Knowledge API.
 *
 * WARNING: This is a destructive operation! It will delete all knowledge entries.
 * The script requires interactive confirmation to prevent accidental execution.
 *
 * API Reference:
 * - List: https://docs.devin.ai/api-reference/knowledge/list-knowledge
 * - Delete: https://docs.devin.ai/api-reference/knowledge/delete-knowledge
 *
 * Usage: DEVIN_API_KEY=your_token npx tsx scripts/devin/delete-all-devin-knowledge.ts
 */

import process from "node:process";
import * as readline from "readline";

interface ApiKnowledgeEntry {
  id: string;
  name: string;
}

interface ApiListResponse {
  folders: { id: string; name: string }[];
  knowledge: ApiKnowledgeEntry[];
}

const API_BASE = "https://api.devin.ai/v1";

async function apiRequest<T>(method: string, endpoint: string): Promise<T> {
  const token = process.env.DEVIN_API_KEY;
  if (!token) {
    throw new Error("DEVIN_API_KEY environment variable is not set");
  }

  const url = `${API_BASE}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

async function listKnowledge(): Promise<ApiListResponse> {
  return apiRequest<ApiListResponse>("GET", "/knowledge");
}

async function deleteKnowledge(noteId: string): Promise<void> {
  await apiRequest<void>("DELETE", `/knowledge/${noteId}`);
}

function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toUpperCase() === "Y");
    });
  });
}

async function main() {
  // Check if running in a TTY (interactive terminal)
  if (!process.stdin.isTTY) {
    console.error("Error: This script must be run interactively (not in CI or piped input).");
    console.error("This is a safety measure to prevent accidental deletion.");
    process.exit(1);
  }

  console.log("Fetching existing knowledge from Devin API...\n");
  const remoteData = await listKnowledge();

  const entryCount = remoteData.knowledge.length;

  if (entryCount === 0) {
    console.log("No knowledge entries found. Nothing to delete.");
    process.exit(0);
  }

  console.log(`Found ${entryCount} knowledge entries:\n`);
  for (const entry of remoteData.knowledge) {
    console.log(`  - ${entry.name}`);
  }

  console.log("\n⚠️  WARNING: This will permanently delete ALL knowledge entries listed above!");
  console.log("This action cannot be undone.\n");

  const confirmed = await askConfirmation("Are you sure you want to delete all entries? (Y/n): ");

  if (!confirmed) {
    console.log("\nAborted. No entries were deleted.");
    process.exit(0);
  }

  console.log("\nDeleting all knowledge entries...\n");

  let deleted = 0;
  for (const entry of remoteData.knowledge) {
    process.stdout.write(`  Deleting: ${entry.name}...`);
    await deleteKnowledge(entry.id);
    console.log(" ✓");
    deleted++;
  }

  console.log(`\nSuccessfully deleted ${deleted} knowledge entries.`);
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
