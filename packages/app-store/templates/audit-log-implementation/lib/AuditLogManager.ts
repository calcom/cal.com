import type { AuditLogEvent, AuditLogsManager } from "@calcom/features/audit-logs/types";
import logger from "@calcom/lib/logger";

import type { AppKeys } from "../zod";

type GenericAuditLogClient = {
  credentials: AppKeys;
  reportEvent: (event: any) => Promise<void>;
};

const log = logger.getSubLogger({ prefix: ["AuditLogManager"] });
export default class GenericAuditLogManager implements AuditLogsManager {
  private client: undefined | GenericAuditLogClient;

  constructor(appKeys: AppKeys) {
    log.silly("Initializing GenericAuditLogManager");

    this.client = {
      credentials: {
        apiKey: appKeys.apiKey,
        projectId: appKeys.projectId,
      },
      async reportEvent(event: any) {
        console.log(event);
      },
    };
  }

  public async report(event: AuditLogEvent) {
    this.client?.reportEvent(event);
  }
}
