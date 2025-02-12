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

const returnNullValue = { email: null, recordType: null, crmAppSlug: null };

async function findUserByEmailWhoIsAHostOfEventType({
  email,
  eventTypeId,
}: {
  email: string;
  eventTypeId: number;
}) {
  return prisma.user.findFirst({
    where: {
      email,
      hosts: { some: { eventTypeId } },
    },
  });
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

  const routingFormResponseQuery = await prisma.app_RoutingForms_FormResponse.findFirst({
    where: {
      id: routingFormResponseId,
    },
    include: {
      form: {
        select: {
          routes: true,
        },
      },
    },
  });

  if (!routingFormResponseQuery || !routingFormResponseQuery?.form.routes) return null;
  const parsedRoutes = routesSchema.safeParse(routingFormResponseQuery?.form.routes);

  if (!parsedRoutes.success || !parsedRoutes.data) return null;

  // Find the route with the attributeRoutingConfig
  const route = parsedRoutes.data.find((route) => {
    if ("action" in route) {
      return route.id === routingFormResponseQuery.chosenRouteId;
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
async function getOwnerEmailFromCrm(
  eventData: EventData,
  email: string
): Promise<{ email: string | null; recordType: string | null; crmAppSlug: string | null }> {
  const crmContactOwner = await getCRMContactOwnerForRRLeadSkip(email, eventData.metadata);
  if (!crmContactOwner?.email) return returnNullValue;

  // Determine if the contactOwner is a part of the event type
  const contactOwnerQuery = await findUserByEmailWhoIsAHostOfEventType({
    email: crmContactOwner.email,
    eventTypeId: eventData.id,
  });
  if (!contactOwnerQuery) return returnNullValue;
  return crmContactOwner;
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
  const nullReturnValue = { email: null, skipContactOwner: false, recordType: "" };

  if (!attributeRoutingConfig) return nullReturnValue;

  // If the skipContactOwner is enabled then don't return an team member email
  if (attributeRoutingConfig.skipContactOwner) return { ...nullReturnValue, skipContactOwner: true };

  const appBookingFormHandler = (await import("@calcom/app-store/routing-forms/appBookingFormHandler"))
    .default;
  const appHandler = appBookingFormHandler[crmAppSlug];
  if (!appHandler) return nullReturnValue;

  const { email: userEmail, recordType } = await appHandler(bookerEmail, attributeRoutingConfig, eventTypeId);

  if (!userEmail) return nullReturnValue;

  // Determine if the user is a part of the event type
  const userQuery = await findUserByEmailWhoIsAHostOfEventType({ email: userEmail, eventTypeId });

  if (!userQuery) return nullReturnValue;

  return { ...nullReturnValue, email: userEmail, recordType };
}

async function getTeamMemberEmailForResponseOrContact({
  bookerEmail,
  eventData,
  routingFormResponseId,
  chosenRoute,
  crmAppSlug,
}: {
  bookerEmail: string;
  eventData: EventData;
  routingFormResponseId?: number | null;
  /**
   * If provided, we won't go look for the route from DB.
   */
  chosenRoute?: LocalRoute;
  crmAppSlug?: string;
}) {
  const eventTypeId = eventData.id;
  if (eventData.schedulingType !== SchedulingType.ROUND_ROBIN) return returnNullValue;

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
    const { email, skipContactOwner, recordType } = await getTeamMemberEmailUsingRoutingFormHandler({
      bookerEmail,
      eventTypeId,
      attributeRoutingConfig,
      crmAppSlug,
    });

    if (skipContactOwner) return returnNullValue;
    if (email) return { email, recordType, crmAppSlug };
  } else {
    log.debug("Getting the contact owner email from CRM");
    return await getOwnerEmailFromCrm(eventData, bookerEmail);
  }

  return returnNullValue;
}

export async function getTeamMemberEmailForResponseOrContactUsingUrlQuery({
  query,
  eventData,
  chosenRoute,
}: {
  query: ParsedUrlQuery;
  eventData: EventData;
  chosenRoute?: LocalRoute;
}) {
  // Without email no lookup is possible
  if (!query.email || typeof query.email !== "string") {
    return returnNullValue;
  }

  log.debug("getTeamMemberEmailForResponseOrContactUsingUrlQuery", safeStringify({ query }));

  const crmAppSlug = getEnabledRoutingFormAppSlugFromQuery(query);

  const routingFormResponseId = getRoutingFormResponseIdFromQuery(query);

  return await getTeamMemberEmailForResponseOrContact({
    bookerEmail: query.email,
    eventData,
    routingFormResponseId,
    chosenRoute,
    crmAppSlug,
  });
}
