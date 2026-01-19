#!/usr/bin/env npx ts-node

/**
 * Syncs knowledge from the generated JSON file to Devin's Knowledge API.
 * - Creates folders if they don't exist
 * - Creates new knowledge entries
 * - Updates existing entries (matched by name)
 * - Optionally deletes entries that no longer exist in the source
 *
 * Usage: DEVIN_API_TOKEN=your_token npx ts-node sync-to-devin.ts [--delete-removed]
 */

import * as fs from "fs";
import * as path from "path";

interface DevinKnowledgeEntry {
  name: string;
  body: string;
  trigger_description: string;
  folder?: string;
}

interface DevinKnowledgeFolder {
  name: string;
  description: string;
}

interface DevinKnowledgeOutput {
  folders: DevinKnowledgeFolder[];
  knowledge: DevinKnowledgeEntry[];
}

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

const API_BASE = "https://api.devin.ai/v1";

async function apiRequest<T>(
  method: string,
  endpoint: string,
  body?: Record<string, unknown>
): Promise<T> {
  const token = process.env.DEVIN_API_TOKEN;
  if (!token) {
    throw new Error("DEVIN_API_TOKEN environment variable is not set");
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

async function createFolder(name: string, description: string): Promise<ApiFolder> {
  return apiRequest<ApiFolder>("POST", "/knowledge/folders", { name, description });
}

async function createKnowledge(
  name: string,
  body: string,
  triggerDescription: string,
  parentFolderId?: string
): Promise<ApiKnowledgeEntry> {
  const payload: Record<string, unknown> = {
    name,
    body,
    trigger_description: triggerDescription,
  };
  if (parentFolderId) {
    payload.parent_folder_id = parentFolderId;
  }
  return apiRequest<ApiKnowledgeEntry>("POST", "/knowledge", payload);
}

async function updateKnowledge(
  noteId: string,
  name: string,
  body: string,
  triggerDescription: string,
  parentFolderId?: string
): Promise<ApiKnowledgeEntry> {
  const payload: Record<string, unknown> = {
    name,
    body,
    trigger_description: triggerDescription,
  };
  if (parentFolderId) {
    payload.parent_folder_id = parentFolderId;
  }
  return apiRequest<ApiKnowledgeEntry>("PUT", `/knowledge/${noteId}`, payload);
}

async function deleteKnowledge(noteId: string): Promise<void> {
  await apiRequest<void>("DELETE", `/knowledge/${noteId}`);
}

async function main() {
  const args = process.argv.slice(2);
  const deleteRemoved = args.includes("--delete-removed");

  const agentsDir = path.dirname(__filename);
  const jsonPath = path.join(agentsDir, "devin-knowledge.json");

  if (!fs.existsSync(jsonPath)) {
    console.error("Error: devin-knowledge.json not found. Run parse-to-devin-knowledge.ts first.");
    process.exit(1);
  }

  const localData: DevinKnowledgeOutput = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  console.log("Fetching existing knowledge from Devin API...");
  const remoteData = await listKnowledge();

  console.log(`Found ${remoteData.folders.length} folders and ${remoteData.knowledge.length} entries in Devin\n`);

  // Build folder name -> id map
  const folderMap = new Map<string, string>();
  for (const folder of remoteData.folders) {
    folderMap.set(folder.name, folder.id);
  }

  // Create missing folders
  console.log("Syncing folders...");
  for (const folder of localData.folders) {
    if (!folderMap.has(folder.name)) {
      console.log(`  Creating folder: ${folder.name}`);
      const created = await createFolder(folder.name, folder.description);
      folderMap.set(folder.name, created.id);
    } else {
      console.log(`  Folder exists: ${folder.name}`);
    }
  }

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
    const folderId = entry.folder ? folderMap.get(entry.folder) : undefined;
    const existing = remoteKnowledgeMap.get(entry.name);

    if (existing) {
      seenRemoteIds.add(existing.id);

      // Check if content changed
      const bodyChanged = existing.body !== entry.body;
      const triggerChanged = existing.trigger_description !== entry.trigger_description;

      if (bodyChanged || triggerChanged) {
        console.log(`  Updating: ${entry.name}`);
        await updateKnowledge(existing.id, entry.name, entry.body, entry.trigger_description, folderId);
        updated++;
      } else {
        unchanged++;
      }
    } else {
      console.log(`  Creating: ${entry.name}`);
      await createKnowledge(entry.name, entry.body, entry.trigger_description, folderId);
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
