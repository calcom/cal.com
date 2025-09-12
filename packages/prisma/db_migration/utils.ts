import type { PrismaClient as NewPrismaClient } from "@prisma/client";
import type { PrismaClient as OldPrismaClient } from "@prisma/client";

import type { IdMappings, MigrationContext } from "./types";

// Initialize ID mappings
export function createIdMappings(): IdMappings {
  return {
    users: {},
    profiles: {},
    schedules: {},
    calIdTeams: {},
    calIdMemberships: {},
    calIdWorkflows: {},
    calIdWorkflowSteps: {},
    calIdTeamFeatures: {},
    credentials: {},
    eventTypes: {},
    availabilities: {},
    apps: {},
    features: {},
    roles: {},
    apiKeys: {},
    attributes: {},
    attributeOptions: {},
    secondaryEmails: {},
    accounts: {},
    sessions: {},
    webhooks: {},
    routingForms: {},
    workspacePlatforms: {},
    delegationCredentials: {},
    oauthClients: {},
    verifiedNumbers: {},
    verifiedEmails: {},
    instantMeetingTokens: {},
    payments: {},
    bookingSeats: {},
    outOfOfficeReasons: {},
    outOfOfficeEntries: {},
    internalNotePresets: {},
    filterSegments: {},
  };
}

// Logging utilities
export function log(message: string, data?: any) {
  console.log(`[${new Date().toISOString()}] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

export function logError(message: string, error: any) {
  console.error(`[${new Date().toISOString()}] ERROR: ${message}`);
  console.error(error);
}

// Batch processing utility
export async function processBatch<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  batchSize = 50
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
    log(
      `Processed batch ${Math.ceil((i + batchSize) / batchSize)} of ${Math.ceil(items.length / batchSize)}`
    );
  }
  return results;
}

// Create migration context
export function createMigrationContext(
  oldDb: OldPrismaClient,
  newDb: NewPrismaClient,
  idMappings: IdMappings
): MigrationContext {
  return {
    oldDb,
    newDb,
    idMappings,
    log,
    logError,
    processBatch,
  };
}
