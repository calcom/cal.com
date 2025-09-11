export interface IdMapping {
  [oldId: string]: number;
}

export interface IdMappings {
  // Core entities
  users: IdMapping;
  profiles: IdMapping;
  schedules: IdMapping;

  // CalId entities
  calIdTeams: IdMapping;
  calIdMemberships: IdMapping;
  calIdWorkflows: IdMapping;
  calIdWorkflowSteps: IdMapping;
  calIdTeamFeatures: IdMapping;

  // Other entities
  credentials: IdMapping;
  eventTypes: IdMapping;
  availabilities: IdMapping;
  apps: IdMapping;
  features: IdMapping;
  roles: IdMapping;
  apiKeys: IdMapping;
  attributes: IdMapping;
  attributeOptions: IdMapping;
  secondaryEmails: IdMapping;
  accounts: IdMapping;
  sessions: IdMapping;
  webhooks: IdMapping;
  routingForms: IdMapping;
  workspacePlatforms: IdMapping;
  delegationCredentials: IdMapping;
  oauthClients: IdMapping;
  verifiedNumbers: IdMapping;
  verifiedEmails: IdMapping;
  instantMeetingTokens: IdMapping;
  payments: IdMapping;
  bookingSeats: IdMapping;
  outOfOfficeReasons: IdMapping;
  outOfOfficeEntries: IdMapping;
  internalNotePresets: IdMapping;
  filterSegments: IdMapping;
}

export interface MigrationContext {
  oldDb: any; // Replace with actual PrismaClient type
  newDb: any; // Replace with actual PrismaClient type
  idMappings: IdMappings;
  log: (message: string, data?: any) => void;
  logError: (message: string, error: any) => void;
  processBatch: <T, R>(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>,
    batchSize?: number
  ) => Promise<R[]>;
}
