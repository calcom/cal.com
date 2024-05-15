import type { AuditLogsManager } from "@calcom/features/audit-logs/AuditLogsManager";
import logger from "@calcom/lib/logger";

import type { AppKeys } from "../zod";

export type GenericAuditLogClient = {
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

  public async report(input: string) {
    const event = {
      action: "bookings.event.created",
      teamId: "My Rad Customer",
      crud: "c" as const,
      source_ip: "GET IP",
      actor: {
        id: "121",
        name: "Sam Graham",
      },
      target: {
        id: "test",
        name: "TEST",
        url: "https://customertowne.xyz/records/",
      },
      input,
    };

    this.client?.reportEvent(event);
  }
}
