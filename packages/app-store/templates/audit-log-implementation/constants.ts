import { getHref } from "templates/audit-log-implementation/lib/utils";

import type { IconName } from "@calcom/ui";

type AppSettingOptionEntry = {
  name: string;
  href: string;
  icon: IconName;
}[];

export const appSettingsOptions: AppSettingOptionEntry = [
  {
    name: "Credentials",
    href: "/apps/installed/auditLogs",
    icon: "bar-chart",
  },
  {
    name: "Logs",
    href: getHref("/apps/installed/auditLogs", { credentialId: "1", activeOption: "logs" }),
    icon: "bar-chart",
  },
];
