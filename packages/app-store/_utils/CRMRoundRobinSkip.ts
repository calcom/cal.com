import type { z } from "zod";

import CrmManager from "@calcom/core/crmManager/crmManager";
import { prisma } from "@calcom/prisma";
import type { EventTypeAppMetadataSchema } from "@calcom/prisma/zod-utils";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

export async function getCRMContactOwnerForRRLeadSkip(bookerEmail: string, eventTypeId: number) {
  const eventTypeMetadataQuery = await prisma.eventType.findUnique({
    where: {
      id: eventTypeId,
    },
    select: { metadata: true },
  });

  const eventTypeMetadata = EventTypeMetaDataSchema.safeParse(eventTypeMetadataQuery?.metadata);

  if (!eventTypeMetadata.success || !eventTypeMetadata.data?.apps) return;

  const crm = await getCRMManagerWithRRLeadSkip(eventTypeMetadata.data.apps);

  if (!crm) return;

  const contact = await crm.getContacts(bookerEmail, true);
  if (contact?.length) {
    return contact[0].ownerEmail;
  }
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

  if (crmRoundRobinLeadSkip) {
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
    if (crmCredential) {
      return new CrmManager(crmCredential);
    }
  }
  return;
}

export async function getCRMSkipRoundRobinUsernamePool({
  eventUsers,
  eventTypeId,
  attendeeEmail,
  orgSlug,
}: {
  eventUsers: { username: string; isFixed: boolean }[];
  eventTypeId: number;
  attendeeEmail: string;
  orgSlug?: string;
}) {
  const crmContactOwner = await getCRMContactOwnerForRRLeadSkip(attendeeEmail, eventTypeId);

  if (crmContactOwner) {
    const ownerUsername = await prisma.user.findUnique({
      where: {
        email: crmContactOwner,
        ...(orgSlug ? { organization: { slug: orgSlug } } : {}),
      },
      select: {
        username: true,
      },
    });

    const roundRobinUsernamePool = [];

    if (ownerUsername?.username) {
      const roundRobinHost = eventUsers.find((user) => user.username === ownerUsername.username);

      // If the contact owner is a fixed host, then include all hosts in RR selection
      if (roundRobinHost?.isFixed) {
        return roundRobinUsernamePool;
      }

      roundRobinUsernamePool.push(ownerUsername.username);
      // Include fixed hosts
      roundRobinUsernamePool.push(
        ...eventUsers.reduce(
          (fixedHosts, user) => (user?.isFixed ? fixedHosts.push(user.username) : fixedHosts),
          []
        )
      );
    }

    return roundRobinUsernamePool;
  }
}
