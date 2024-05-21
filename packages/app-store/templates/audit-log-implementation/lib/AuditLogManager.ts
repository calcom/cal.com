import type { AuditLogEvent, AuditLogsManager } from "@calcom/features/audit-logs/types";
import logger from "@calcom/lib/logger";

import type { AppKeys } from "../zod";

type GenericAuditLogClient = {
  credentials: AppKeys;
  reportEvent: (event: AuditLogEvent) => void;
};

function getGenericAuditLogClient(
  apiKey: string,
  projectId: string,
  endpoint: string
): GenericAuditLogClient {
  return {
    credentials: {
      apiKey: apiKey,
      projectId: projectId,
      endpoint: endpoint,
    },
    reportEvent: (event: AuditLogEvent) => {
      console.log({ event });
    },
  };
}

const log = logger.getSubLogger({ prefix: ["AuditLogManager"] });
export default class GenericAuditLogManager implements AuditLogsManager {
  private client: undefined | GenericAuditLogClient;

  constructor(appKeys: AppKeys) {
    log.silly("Initializing GenericAuditLogManager");

    this.client = getGenericAuditLogClient(appKeys.apiKey, appKeys.projectId, appKeys.endpoint);
  }

  public async reportEvent(event: AuditLogEvent) {
    log.silly("Reporting event.");
    // Here you can intercept the event before its sent by your client.
    this.client?.reportEvent(event);
  }
}
