#!/usr/bin/env -S npx tsx

/**
 * Syncs knowledge from the generated JSON file to Devin's Knowledge API.
 * - Creates new knowledge entries
 * - Updates existing entries (matched by name)
 * - Optionally deletes entries that no longer exist in the source
 *
 * Note: The Devin API v1 does not support creating folders via API.
 * Entries will be created without folder assignment. You can organize
 * them into folders manually in the Devin UI if needed.
 *
 * Usage: DEVIN_API_KEY=your_token npx tsx scripts/devin/sync-knowledge-to-devin.ts [--delete-removed]
 */

import process from "node:process";
import * as fs from "fs";
import * as path from "path";

interface DevinKnowledgeEntry {
  name: string;
  body: string;
  trigger_description: string;
}

interface DevinKnowledgeOutput {
  knowledge: DevinKnowledgeEntry[];
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
  folders: { id: string; name: string }[];
  knowledge: ApiKnowledgeEntry[];
}

const API_BASE = "https://api.devin.ai/v1";

async function apiRequest<T>(method: string, endpoint: string, body?: Record<string, unknown>): Promise<T> {
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

  if (body) {
    options.body = JSON.stringify(body);
  }

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

async function createKnowledge(
  name: string,
  body: string,
  triggerDescription: string
): Promise<ApiKnowledgeEntry> {
  return apiRequest<ApiKnowledgeEntry>("POST", "/knowledge", {
    name,
    body,
    trigger_description: triggerDescription,
  });
}

async function updateKnowledge(
  noteId: string,
  name: string,
  body: string,
  triggerDescription: string
): Promise<ApiKnowledgeEntry> {
  return apiRequest<ApiKnowledgeEntry>("PUT", `/knowledge/${noteId}`, {
    name,
    body,
    trigger_description: triggerDescription,
  });
}

async function deleteKnowledge(noteId: string): Promise<void> {
  await apiRequest<void>("DELETE", `/knowledge/${noteId}`);
}

async function main() {
  const args = process.argv.slice(2);
  const deleteRemoved = args.includes("--delete-removed");

  const agentsDir = path.join(path.dirname(__filename), "..", "..", "agents");
  const jsonPath = path.join(agentsDir, "devin-knowledge.json");

  if (!fs.existsSync(jsonPath)) {
    console.error("Error: devin-knowledge.json not found. Run parse-to-devin-knowledge.ts first.");
    process.exit(1);
  }

  const localData: DevinKnowledgeOutput = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  console.log("Fetching existing knowledge from Devin API...");
  const remoteData = await listKnowledge();

  console.log(
    `Found ${remoteData.folders.length} folders and ${remoteData.knowledge.length} entries in Devin\n`
  );

  // Build knowledge name -> entry map for remote
  const remoteKnowledgeMap = new Map<string, ApiKnowledgeEntry>();
  for (const entry of remoteData.knowledge) {
    remoteKnowledgeMap.set(entry.name, entry);
  }

  // Track which remote entries we've seen
  const seenRemoteIds = new Set<string>();

  // Sync knowledge entries
  console.log("\nSyncing knowledge entries...");
  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const entry of localData.knowledge) {
    const existing = remoteKnowledgeMap.get(entry.name);

    if (existing) {
      seenRemoteIds.add(existing.id);

      const bodyChanged = existing.body !== entry.body;
      const triggerChanged = existing.trigger_description !== entry.trigger_description;

      if (bodyChanged || triggerChanged) {
        console.log(`  Updating: ${entry.name}`);
        await updateKnowledge(existing.id, entry.name, entry.body, entry.trigger_description);
        updated++;
      } else {
        unchanged++;
      }
    } else {
      console.log(`  Creating: ${entry.name}`);
      await createKnowledge(entry.name, entry.body, entry.trigger_description);
      created++;
    }
  }

  // Delete removed entries if flag is set
  let deleted = 0;
  if (deleteRemoved) {
    console.log("\nChecking for entries to delete...");
    for (const entry of remoteData.knowledge) {
      if (!seenRemoteIds.has(entry.id)) {
        console.log(`  Deleting: ${entry.name}`);
        await deleteKnowledge(entry.id);
        deleted++;
      }
    }
  }

  // Summary
  console.log("\n--- Sync Summary ---");
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Unchanged: ${unchanged}`);
  if (deleteRemoved) {
    console.log(`  Deleted: ${deleted}`);
  }
  console.log("Sync complete!");
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
