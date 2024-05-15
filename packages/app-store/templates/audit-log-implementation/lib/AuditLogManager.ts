import type { AuditLogsManager } from "@calcom/features/audit-logs/AuditLogsManager";
import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["AuditLogManager"] });
export default class GenericAuditLogManager implements AuditLogsManager {
  private client: undefined | { reportEvent: (event: any) => void; apiKey: string; projectId: string };

  constructor(appKeys: { apiKey: string; projectId: string }) {
    log.silly("Initializing GenericAuditLogManager");

    this.client = {
      apiKey: appKeys.apiKey,
      projectId: appKeys.projectId,
      async reportEvent(event) {
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
