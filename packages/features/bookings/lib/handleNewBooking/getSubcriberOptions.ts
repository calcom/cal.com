import type { GetSubscriberOptions } from "@calcom/features/webhooks/lib/getWebhooks";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { getTeamIdFromEventType } from "@calcom/lib/getTeamIdFromEventType";
import type { WebhookTriggerEvents } from "@calcom/prisma/enums";

export const getSubcriberOptions = async ({
  eventType,
  organizerId,
  triggerEvent,
}: {
  eventType: { id: number; team: { id: number | null } | null; parentId: number | null };
  organizerId: number;
  triggerEvent: WebhookTriggerEvents;
}): Promise<GetSubscriberOptions> => {
  const teamId = await getTeamIdFromEventType({ eventType });
  const isManagedEvent = teamId && eventType.parentId;

  const triggerForUser = !teamId || isManagedEvent;
  const organizerUserId = triggerForUser ? organizerId : null;

  const orgId = await getOrgIdFromMemberOrTeamId({ memberId: organizerUserId, teamId });

  return {
    userId: triggerForUser ? organizerId : null,
    eventTypeId: eventType.id,
    triggerEvent,
    teamId,
    orgId,
  };
};
