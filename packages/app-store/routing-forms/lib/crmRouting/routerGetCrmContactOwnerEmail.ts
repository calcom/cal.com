import { getCRMContactOwnerForRRLeadSkip } from "@calcom/app-store/_utils/CRMRoundRobinSkip";
import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { CrmRoutingTraceService } from "@calcom/features/routing-trace/services/CrmRoutingTraceService";
import type { RoutingTraceService } from "@calcom/features/routing-trace/services/RoutingTraceService";
import { prisma } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";

import type { LocalRoute } from "../../types/types";
import { enabledAppSlugs } from "../enabledApps";

export default async function routerGetCrmContactOwnerEmail({
  attributeRoutingConfig,
  identifierKeyedResponse,
  action,
  routingTraceService,
}: {
  attributeRoutingConfig: LocalRoute["attributeRoutingConfig"];
  identifierKeyedResponse: Record<string, string | string[]> | null;
  action: LocalRoute["action"];
  routingTraceService?: RoutingTraceService;
}) {
  if (attributeRoutingConfig?.skipContactOwner) return null;

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

  if (action.type !== "eventTypeRedirectUrl" || !action.eventTypeId) return null;

  const eventTypeId = action.eventTypeId;

  const eventTypeRepo = new EventTypeRepository(prisma);
  const eventType = await eventTypeRepo.findByIdIncludeHostsAndTeam({
    id: action.eventTypeId,
  });
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

  const runCrmOperations = async () => {
    for (const appSlug of enabledAppSlugs) {
      const routingOptions = attributeRoutingConfig?.[appSlug as keyof typeof attributeRoutingConfig];

      if (!routingOptions) continue;

      if (Object.values(routingOptions).some((option) => option === true)) {
        const appBookingFormHandler = (await import("@calcom/app-store/routing-forms/appBookingFormHandler"))
          .default;
        const appHandler = appBookingFormHandler[appSlug as keyof typeof appBookingFormHandler];

        const ownerQuery = await appHandler(prospectEmail, attributeRoutingConfig, eventTypeId);

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
  };

  const crmRoutingTraceService = CrmRoutingTraceService.create(routingTraceService);

  if (crmRoutingTraceService) {
    await crmRoutingTraceService.runAsync(runCrmOperations);
  } else {
    await runCrmOperations();
  }

  if (!contactOwner) return null;

  if (!eventType.hosts.some((host) => host.user.email === contactOwner.email)) return null;

  if (routingTraceService && contactOwner.email && contactOwner.crmAppSlug) {
    const salesforceSettings = attributeRoutingConfig?.salesforce;
    routingTraceService.addStep({
      domain: contactOwner.crmAppSlug,
      step: `${contactOwner.crmAppSlug}_assignment`,
      data: {
        email: contactOwner.email,
        recordType: contactOwner.recordType,
        recordId: contactOwner.recordId,
        crmAppSlug: contactOwner.crmAppSlug,
        rrSkipToAccountLookupField: salesforceSettings?.rrSkipToAccountLookupField,
        rrSKipToAccountLookupFieldName: salesforceSettings?.rrSKipToAccountLookupFieldName,
      },
    });
  }

  return contactOwner;
}
