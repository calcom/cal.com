import CrmManager from "@calcom/core/crmManager/crmManager";
import { prisma } from "@calcom/prisma";

export async function getCRMContactOwnerForRRLeadSkip(
  bookerEmail: string,
  eventTypeId: number
  //   apps?: z.infer<typeof EventTypeAppMetadataSchema>
) {
  const eventTypeMetadata = await prisma.eventType.findUnique({
    where: {
      id: eventTypeId,
    },
    select: { metadata: true },
  });

  const apps = eventTypeMetadata?.metadata?.apps;

  if (!apps) return;
  const crm = await getCRMManagerWithRRLeadSkip(apps);

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
