import { getCRMContactOwnerForRRLeadSkip } from "@calcom/app-store/_utils/CRMRoundRobinSkip";
import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { prisma } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";

import type { LocalRoute } from "../../types/types";
import { enabledAppSlugs } from "../enabledApps";

export default async function routerGetCrmContactOwnerEmail({
  attributeRoutingConfig,
  identifierKeyedResponse,
  action,
}: {
  attributeRoutingConfig: LocalRoute["attributeRoutingConfig"];
  identifierKeyedResponse: Record<string, string | string[]> | null;
  action: LocalRoute["action"];
}) {
  // Check if route is skipping CRM contact check
  if (attributeRoutingConfig?.skipContactOwner) return null;
  // Check if email is present
  let prospectEmail: string | null = null;
  if (identifierKeyedResponse) {
    for (const identifier of Object.keys(identifierKeyedResponse)) {
      const fieldResponse = identifierKeyedResponse[identifier];
      if (identifier === "email") {
        prospectEmail = fieldResponse instanceof Array ? fieldResponse[0] : fieldResponse;
        break;
      }
    }
  }
  if (!prospectEmail) return null;

  // Determine if the action is an event type redirect
  if (action.type !== "eventTypeRedirectUrl" || !action.eventTypeId) return null;

  const eventTypeRepo = new EventTypeRepository(prisma);
  const eventType = await eventTypeRepo.findByIdIncludeHostsAndTeam({ id: action.eventTypeId });
  if (!eventType || eventType.schedulingType !== SchedulingType.ROUND_ROBIN) return null;

  const eventTypeMetadata = eventType.metadata;
  if (!eventTypeMetadata) return null;

  let contactOwner: {
    email: string | null;
    recordType: string | null;
    crmAppSlug: string | null;
    recordId: string | null;
  } = {
    email: null,
    recordType: null,
    crmAppSlug: null,
    recordId: null,
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

  if (!contactOwner || (!contactOwner.email && !contactOwner.recordType)) {
    const ownerQuery = await getCRMContactOwnerForRRLeadSkip(prospectEmail, eventTypeMetadata);
    if (ownerQuery?.email) contactOwner = ownerQuery;
  }
  if (!contactOwner) return null;

  //   Check that the contact owner is a part of the event type
  if (!eventType.hosts.some((host) => host.user.email === contactOwner.email)) return null;

  return contactOwner;
}
