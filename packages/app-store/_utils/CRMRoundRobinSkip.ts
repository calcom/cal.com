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
): Promise<{ email: string | null; recordType: string | null; crmAppSlug: string | null }> {
  const nullReturnValue = { email: null, recordType: null, crmAppSlug: "" };
  const parsedEventTypeMetadata = EventTypeMetaDataSchema.safeParse(eventTypeMetadata);
  if (!parsedEventTypeMetadata.success || !parsedEventTypeMetadata.data?.apps) return nullReturnValue;

  const crm = await getCRMManagerWithRRLeadSkip(parsedEventTypeMetadata.data.apps);

  if (!crm) return nullReturnValue;
  const { crmManager, crmAppSlug } = crm;
  const startTime = performance.now();
  const contact = await crmManager.getContacts({ emails: bookerEmail, forRoundRobinSkip: true });
  const endTime = performance.now();
  logger.info(`Fetching from CRM took ${endTime - startTime}ms`);
  if (!contact?.length || !contact[0].ownerEmail) return nullReturnValue;
  return { email: contact[0].ownerEmail ?? null, recordType: contact[0].recordType ?? null, crmAppSlug };
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
  return {
    crmManager: new CrmManager(crmCredential, crmRoundRobinLeadSkip),
    crmAppSlug: crmCredential.appId,
  };
}
