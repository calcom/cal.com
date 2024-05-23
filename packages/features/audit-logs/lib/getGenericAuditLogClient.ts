import type { AuditLogEvent, GenericAuditLogClient } from "../types";

export function getGenericAuditLogClient(
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
