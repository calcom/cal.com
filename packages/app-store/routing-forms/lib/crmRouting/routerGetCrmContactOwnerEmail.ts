import type { z } from "zod";

import { getCRMContactOwnerForRRLeadSkip } from "@calcom/app-store/_utils/CRMRoundRobinSkip";
import { EventTypeRepository } from "@calcom/lib/server/repository/eventType";
import { SchedulingType } from "@calcom/prisma/enums";
import type { ZResponseInputSchema } from "@calcom/trpc/server/routers/viewer/routing-forms/response.schema";

import type { LocalRoute } from "../../types/types";
import { enabledAppSlugs } from "../enabledApps";

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
  if (attributeRoutingConfig?.skipContactOwner) return null;

  // Check if email is present
  let prospectEmail: string | null = null;
  for (const field of Object.keys(response)) {
    const fieldResponse = response[field];
    if (fieldResponse.identifier === "email") {
      prospectEmail = fieldResponse.value as string;
      break;
    }
  }
  if (!prospectEmail) return null;

  // Determine if the action is an event type redirect
  if (action.type !== "eventTypeRedirectUrl" || !action.eventTypeId) return null;

  const eventType = await EventTypeRepository.findByIdIncludeHostsAndTeam({ id: action.eventTypeId });
  if (!eventType || eventType.schedulingType !== SchedulingType.ROUND_ROBIN) return null;

  const eventTypeMetadata = eventType.metadata;
  if (!eventTypeMetadata) return null;

  let contactOwner: { email: string | null; recordType: string | null; crmAppSlug: string | null } = {
    email: null,
    recordType: null,
    crmAppSlug: null,
  };
  //   Determine if there is a CRM option enabled in the chosen route
  for (const appSlug of enabledAppSlugs) {
    const routingOptions = attributeRoutingConfig?.[appSlug as keyof typeof attributeRoutingConfig];

    if (!routingOptions) continue;
    // See if any options are true
    if (Object.values(routingOptions).some((option) => option === true)) {
      const appBookingFormHandler = (await import("@calcom/app-store/routing-forms/appBookingFormHandler"))
        .default;
      const appHandler = appBookingFormHandler[appSlug as keyof typeof appBookingFormHandler];

      const ownerQuery = await appHandler(prospectEmail, attributeRoutingConfig, action.eventTypeId);

      if (ownerQuery?.email) {
        contactOwner = { ...ownerQuery, crmAppSlug: appSlug };
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
