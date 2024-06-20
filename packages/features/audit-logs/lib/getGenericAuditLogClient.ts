import type { AuditLogEvent, GenericAuditLogClient } from "../types";

export function getGenericAuditLogClient(
  apiKey: string,
  projectId: string,
  endpoint: string,
  disabledEvents: (string | undefined)[]
): GenericAuditLogClient {
  return {
    credentials: {
      disabledEvents,
      apiKey,
      projectId,
      endpoint,
    },
    reportEvent: (event: AuditLogEvent) => {
      console.log({ ...event });
    },
  };
}
