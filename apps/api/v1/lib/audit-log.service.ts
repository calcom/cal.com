import type { AuditLogEvent } from "~/lib/types";

export const AuditLogService = {
  async logEvent(event: AuditLogEvent): Promise<void> {
    console.log("Audit Log Event:", event);
  },

  async getEvents(filter?: any): Promise<AuditLogEvent[]> {
    // Returning Expty array for now
    return [];
  },
};
