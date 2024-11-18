import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import CrmManager from "@calcom/core/crmManager/crmManager";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { EventTypeAppMetadataSchema } from "@calcom/prisma/zod-utils";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

export async function getCRMContactOwnerForRRLeadSkip(
  bookerEmail: string,
  eventTypeMetadata: Prisma.JsonValue
): Promise<string | undefined> {
  const parsedEventTypeMetadata = EventTypeMetaDataSchema.safeParse(eventTypeMetadata);
  if (!parsedEventTypeMetadata.success || !parsedEventTypeMetadata.data?.apps) return;

  const crm = await getCRMManagerWithRRLeadSkip(parsedEventTypeMetadata.data.apps);

  if (!crm) return;
  const startTime = performance.now();
  const contact = await crm.getContacts({ emails: bookerEmail, forRoundRobinSkip: true });
  const endTime = performance.now();
  logger.info(`Fetching from CRM took ${endTime - startTime}ms`);
  if (!contact?.length) return;
  return contact[0].ownerEmail;
}

async function getCRMManagerWithRRLeadSkip(apps: z.infer<typeof EventTypeAppMetadataSchema>) {
  let crmRoundRobinLeadSkip;
  for (const appKey in apps) {
    const app = apps[appKey as keyof typeof apps];
    if (
      app.enabled &&
      typeof app.appCategories === "object" &&
      app.appCategories.some((category: string) => category === "crm") &&
      app.roundRobinLeadSkip
    ) {
      crmRoundRobinLeadSkip = app;
      break;
    }
  }
  if (!crmRoundRobinLeadSkip) return;
  const crmCredential = await prisma.credential.findUnique({
    where: {
      id: crmRoundRobinLeadSkip.credentialId,
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });
  if (!crmCredential) return;
  return new CrmManager(crmCredential, crmRoundRobinLeadSkip);
}
