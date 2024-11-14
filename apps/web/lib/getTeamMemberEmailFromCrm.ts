import type { ParsedUrlQuery } from "querystring";

import { getCRMContactOwnerForRRLeadSkip } from "@calcom/app-store/_utils/CRMRoundRobinSkip";
import { ROUTING_FORM_RESPONSE_ID_QUERY_STRING } from "@calcom/app-store/routing-forms/lib/constants";
import { enabledAppSlugs } from "@calcom/app-store/routing-forms/lib/enabledApps";
import type { AttributeRoutingConfig, LocalRoute } from "@calcom/app-store/routing-forms/types/types";
import { zodRoutes as routesSchema } from "@calcom/app-store/routing-forms/zod";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["getTeamMemberEmailFromCrm"] });

interface EventData {
  id: number;
  isInstantEvent: boolean;
  schedulingType: SchedulingType | null;
  metadata: Prisma.JsonValue | null;
  length: number;
}

function getRoutingFormResponseIdFromQuery(query: ParsedUrlQuery) {
  const routingFormResponseIdAsNumber = Number(query[ROUTING_FORM_RESPONSE_ID_QUERY_STRING]);
  const routingFormResponseId = isNaN(routingFormResponseIdAsNumber) ? null : routingFormResponseIdAsNumber;
  return routingFormResponseId;
}

async function getAttributeRoutingConfig(
  data:
    | {
        routingFormResponseId: number;
        eventTypeId: number;
      }
    | {
        route: Pick<LocalRoute, "attributeRoutingConfig">;
      }
) {
  if ("route" in data) {
    return data.route.attributeRoutingConfig ?? null;
  }
  const { routingFormResponseId, eventTypeId } = data;
  const routingFormQuery = await prisma.app_RoutingForms_Form.findFirst({
    where: {
      responses: {
        some: {
          id: routingFormResponseId,
        },
      },
    },
    select: {
      routes: true,
    },
  });
  if (!routingFormQuery || !routingFormQuery?.routes) return null;
  const parsedRoutes = routesSchema.safeParse(routingFormQuery.routes);

  if (!parsedRoutes.success || !parsedRoutes.data) return null;

  // Find the route with the attributeRoutingConfig
  // FIXME: There could be multiple routes with same action.eventTypeId, we should actually ensure we have the chosenRouteId in here and use that route.
  const route = parsedRoutes.data.find((route) => {
    if ("action" in route) {
      return route.action.eventTypeId === eventTypeId;
    }
  });

  if (!route || !("attributeRoutingConfig" in route)) return null;
  // Get attributeRoutingConfig for the form
  const attributeRoutingConfig = route.attributeRoutingConfig;

  if (!attributeRoutingConfig) return null;
  return attributeRoutingConfig;
}

function getEnabledRoutingFormAppSlugFromQuery(query: ParsedUrlQuery) {
  // Determine if a routing form enabled app is in the query. Then pass it to the proper handler
  // Routing form apps will have the format cal.appSlug
  let enabledRoutingFormApp;

  for (const key of Object.keys(query)) {
    const keySplit = key.split(".");

    const appSlug = keySplit[1];

    if (enabledAppSlugs.includes(appSlug)) {
      enabledRoutingFormApp = appSlug;
      break;
    }
  }

  return enabledRoutingFormApp;
}

/**
 * Uses the owner of the contact directly from CRM
 */
async function getOwnerEmailFromCrm(eventData: EventData, email: string): Promise<string | null> {
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

/**
 * Handles custom lookup field logic
 */
async function getTeamMemberEmailUsingRoutingFormHandler({
  bookerEmail,
  eventTypeId,
  attributeRoutingConfig,
  crmAppSlug,
}: {
  bookerEmail: string;
  eventTypeId: number;
  attributeRoutingConfig: AttributeRoutingConfig | null;
  crmAppSlug: string;
}) {
  const nullReturnValue = { email: null, skipContactOwner: false };

  if (!attributeRoutingConfig) return nullReturnValue;

  // If the skipContactOwner is enabled then don't return an team member email
  if (attributeRoutingConfig.skipContactOwner) return { ...nullReturnValue, skipContactOwner: true };

  const appBookingFormHandler = (await import("@calcom/app-store/routing-forms/appBookingFormHandler"))
    .default;
  const appHandler = appBookingFormHandler[crmAppSlug];

  if (!appHandler) return nullReturnValue;

  const { email: userEmail } = await appHandler(bookerEmail, attributeRoutingConfig, eventTypeId);

  if (!userEmail) return nullReturnValue;

  // Determine if the user is a part of the event type
  const userQuery = await prisma.user.findFirst({
    where: {
      email: userEmail,
      hosts: {
        some: {
          eventTypeId: eventTypeId,
        },
      },
    },
  });

  if (!userQuery) return nullReturnValue;

  return { ...nullReturnValue, email: userEmail };
}

async function getTeamMemberEmailForResponseOrContact({
  bookerEmail,
  eventTypeId,
  eventData,
  routingFormResponseId,
  chosenRoute,
  crmAppSlug,
}: {
  bookerEmail: string;
  eventTypeId: number;
  eventData: EventData;
  routingFormResponseId?: number | null;
  /**
   * If provided, we won't go look for the route from DB.
   */
  chosenRoute?: LocalRoute;
  crmAppSlug: string;
}) {
  if (eventData.schedulingType !== SchedulingType.ROUND_ROBIN) return null;

  const attributeRoutingConfigGetterData = routingFormResponseId
    ? { routingFormResponseId, eventTypeId }
    : chosenRoute
    ? { route: chosenRoute }
    : null;

  // If we have found crmAppSlug, it means that the CRM App in the routing-form will handle the logic
  if (attributeRoutingConfigGetterData && crmAppSlug) {
    log.debug(
      "Using CRM App handler in routing-forms",
      safeStringify({ attributeRoutingConfigGetterData, crmAppSlug })
    );
    const attributeRoutingConfig = await getAttributeRoutingConfig(attributeRoutingConfigGetterData);
    const { email, skipContactOwner } = await getTeamMemberEmailUsingRoutingFormHandler({
      bookerEmail,
      eventTypeId,
      attributeRoutingConfig,
      crmAppSlug,
    });

    if (skipContactOwner) return null;
    if (email) return email;
  } else {
    log.debug("Getting the contact owner email from CRM");
    return await getOwnerEmailFromCrm(eventData, bookerEmail);
  }

  return null;
}

export async function getTeamMemberEmailForResponseOrContactUsingUrlQuery({
  query,
  eventTypeId,
  eventData,
  chosenRoute,
}: {
  query: ParsedUrlQuery;
  eventTypeId: number;
  eventData: EventData;
  chosenRoute?: LocalRoute;
}) {
  // Without email no lookup is possible
  if (!query.email || typeof query.email !== "string") {
    return null;
  }

  log.debug("getTeamMemberEmailForResponseOrContactUsingUrlQuery", safeStringify({ query }));

  const crmAppSlug = getEnabledRoutingFormAppSlugFromQuery(query);
  if (!crmAppSlug) return null;

  const routingFormResponseId = getRoutingFormResponseIdFromQuery(query);

  return await getTeamMemberEmailForResponseOrContact({
    bookerEmail: query.email,
    eventTypeId,
    eventData,
    routingFormResponseId,
    chosenRoute,
    crmAppSlug,
  });
}
