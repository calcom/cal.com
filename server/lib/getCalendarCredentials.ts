import { Credential } from "@prisma/client";

import { getCalendarAdapterOrNull } from "@lib/calendarClient";
import { ALL_INTEGRATIONS } from "@lib/integrations/getIntegrations";

export default function getCalendarCredentials(
  credentials: Array<Omit<Credential, "userId">>,
  userId: number
) {
  const calendarCredentials = credentials
    .filter((credential) => credential.type.endsWith("_calendar"))
    .flatMap((credential) => {
      const integration = ALL_INTEGRATIONS.find((integration) => integration.type === credential.type);

      const adapter = getCalendarAdapterOrNull({
        ...credential,
        userId,
      });
      return integration && adapter && integration.variant === "calendar"
        ? [{ integration, credential, adapter }]
        : [];
    });

  return calendarCredentials;
}
