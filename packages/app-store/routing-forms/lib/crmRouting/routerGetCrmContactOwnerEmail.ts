import type { z } from "zod";

import { getCRMContactOwnerForRRLeadSkip } from "@calcom/app-store/_utils/CRMRoundRobinSkip";
import { EventTypeRepository } from "@calcom/lib/server/repository/eventType";
import { SchedulingType } from "@calcom/prisma/enums";
import type { ZResponseInputSchema } from "@calcom/trpc/server/routers/viewer/routing-forms/response.schema";

import { enabledAppSlugs } from "../enabledApps";
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
  // Check if route is skipping CRM contact check
  if (attributeRoutingConfig?.skipCrmContactCheck) return null;

  // Check if email is present
  let prospectEmail = null;
  for (const field of Object.keys(response)) {
    const fieldResponse = response[field];
    if (fieldResponse.identifier === "email") {
      prospectEmail = fieldResponse.value;
      break;
    }
  }
  if (!prospectEmail) return null;

  // Determine if the action is an event type redirect
  if (action.type !== "eventTypeRedirectUrl") return null;

  const eventType = await EventTypeRepository.findByIdIncludeHostsAndTeam({ id: action.eventTypeId });
  if (!eventType || eventType.schedulingType !== SchedulingType.ROUND_ROBIN) return null;

  const eventTypeMetadata = eventType.metadata;
  if (!eventTypeMetadata) return null;

  let contactOwner = null;
  //   Determine if there is a CRM option enabled in the chosen route
  for (const appSlug of enabledAppSlugs) {
    const routingOptions = attributeRoutingConfig?.[appSlug];

    if (!routingOptions) continue;
    // See if any options are true
    if (Object.values(routingOptions).some((option) => option === true)) {
      const appBookingFormHandler = (await import("@calcom/app-store/routing-forms/appBookingFormHandler"))
        .default;
      const appHandler = appBookingFormHandler[appSlug];

      const ownerQuery = await appHandler(prospectEmail, attributeRoutingConfig, action.eventTypeId);

      if (ownerQuery?.email) {
        contactOwner = ownerQuery;
        break;
      }
    }
  }

  if (!contactOwner) {
    const ownerQuery = await getCRMContactOwnerForRRLeadSkip(prospectEmail, eventTypeMetadata);
    if (ownerQuery?.email) contactOwner = ownerQuery;
  }
  if (!contactOwner) return null;

  //   Check that the contact owner is a part of the event type
  if (!eventType.hosts.some((host) => host.user.email === contactOwner.email)) return null;

  return contactOwner;
}
