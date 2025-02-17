import type { z } from "zod";

import { EventTypeRepository } from "@calcom/lib/server/repository/eventType";
import type { ZResponseInputSchema } from "@calcom/trpc/server/routers/viewer/routing-forms/response.schema";

import type { LocalRoute } from "../types/types";

export default async function routerGetCrmContactOwnerEmail({
  attributeRoutingConfig,
  response,
  action,
}: {
  attributeRoutingConfig: LocalRoute["attributeRoutingConfig"];
  response: z.infer<typeof ZResponseInputSchema>["response"];
  action: LocalRoute["action"];
}) {
  // Check if email is present
  const prospectEmail = response["email"];
  if (!prospectEmail) return null;

  // Determine if the action is an event type redirect
  if (action.type !== "eventTypeRedirectUrl") return null;

  const eventType = await EventTypeRepository.findByIdMinimal({ id: action.eventTypeId });
  if (!eventType || eventType.schedulingType !== SchedulingType.ROUND_ROBIN) return null;

  const eventTypeMetadata = eventType.metadata;
  if (!eventTypeMetadata) return null;

  const contactOwnerEmail = await getOwnerEmailFromCrm(eventTypeMetadata, prospectEmail);
  if (!contactOwnerEmail) return null;

  //   Check that the contact owner is a part of the event type
  if (!eventType.hosts.some((host) => host.user.email === contactOwnerEmail.email)) return null;

  return contactOwnerEmail;
}
