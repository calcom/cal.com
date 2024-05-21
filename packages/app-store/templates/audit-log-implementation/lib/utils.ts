import type { AuditLogEvent } from "@calcom/features/audit-logs/types";
import { WEBAPP_URL } from "@calcom/lib/constants";
import type { IconName } from "@calcom/ui";

import type { GenericAuditLogClient } from "./AuditLogManager";

export function getHref(
  baseURL: string,
  activeSettingsOption: { credentialId: string; activeOption: string }
) {
  const baseUrlParsed = new URL(baseURL, WEBAPP_URL);
  baseUrlParsed.searchParams.set(activeSettingsOption.credentialId, activeSettingsOption.activeOption);
  return baseUrlParsed.toString();
}

type AppSettingOptionEntry = {
  name: string;
  href: string;
  icon: IconName;
}[];

export function getAppSettingsOptions(credentialId: string): AppSettingOptionEntry[] {
  return [
    {
      name: "Credentials",
      href: "/apps/installed/auditLogs",
      icon: "bar-chart",
    },
    {
      name: "Logs",
      href: getHref("/apps/installed/auditLogs", { credentialId: credentialId, activeOption: "logs" }),
      icon: "bar-chart",
    },
  ];
}

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
