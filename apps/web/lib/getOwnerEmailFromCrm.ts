import type { Prisma } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";

export async function getOwnerEmailFromCrm(
  eventData: {
    id: number;
    schedulingType: SchedulingType | null;
    metadata: Prisma.JsonValue | null;
  },
  email?: string
): Promise<string | null> {
  // Pre-requisites
  if (!eventData || !email || eventData.schedulingType !== SchedulingType.ROUND_ROBIN) return null;

  const { getCRMContactOwnerForRRLeadSkip } = await import("@calcom/app-store/_utils/CRMRoundRobinSkip");
  const { default: prisma } = await import("@calcom/prisma");
  const crmContactOwnerEmail = await getCRMContactOwnerForRRLeadSkip(email, eventData.metadata);
  if (!crmContactOwnerEmail) return null;
  // Determine if the contactOwner is a part of the event type
  const contactOwnerQuery = await prisma.user.findFirst({
    where: {
      email: crmContactOwnerEmail,
      hosts: {
        some: {
          eventTypeId: eventData.id,
        },
      },
    },
  });
  if (!contactOwnerQuery) return null;
  return crmContactOwnerEmail;
}
