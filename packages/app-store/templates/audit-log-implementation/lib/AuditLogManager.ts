import { getGenericAuditLogClient } from "@calcom/features/audit-logs/lib/getGenericAuditLogClient";
import type {
  AuditLogEvent,
  AuditLogsManager,
  GenericAuditLogClient,
} from "@calcom/features/audit-logs/types";
import logger from "@calcom/lib/logger";
import { AuditLogSystemTriggerEvents } from "@calcom/prisma/enums";

import config from "../config.json";
import type { AppKeys } from "../zod";

const log = logger.getSubLogger({ prefix: ["AuditLogManager", config.slug] });
export default class GenericAuditLogManager implements AuditLogsManager {
  private client: undefined | GenericAuditLogClient;

  constructor(appKeys: AppKeys) {
    log.silly("Initializing GenericAuditLogManager");

    // This is where your audit log client goes. Should be edited.
    this.client = getGenericAuditLogClient(
      appKeys.apiKey,
      appKeys.projectId,
      appKeys.endpoint,
      appKeys.disabledEvents
    );
  }

  public async reportEvent(event: AuditLogEvent) {
    log.silly("Reporting event.");
    if (event.action === AuditLogSystemTriggerEvents.SYSTEM_MISC) {
      event.action = event.fields?.implementationAction as string;
    }
    // Here you can intercept the event before its sent by your client.
    this.client?.reportEvent(event);
  }
}
