import type { ParsedUrlQuery } from "node:querystring";
/* eslint-disable */
import { getCRMContactOwnerForRRLeadSkip } from "@calcom/app-store/_utils/CRMRoundRobinSkip";
import {
  ROUTING_FORM_QUEUED_RESPONSE_ID_QUERY_STRING,
  ROUTING_FORM_RESPONSE_ID_QUERY_STRING,
} from "@calcom/app-store/routing-forms/lib/constants";
import { enabledAppSlugs } from "@calcom/app-store/routing-forms/lib/enabledApps";
import type { AttributeRoutingConfig, LocalRoute } from "@calcom/app-store/routing-forms/types/types";
import { zodRoutes as routesSchema } from "@calcom/app-store/routing-forms/zod";
import { RoutingFormResponseRepository } from "@calcom/features/routing-forms/repositories/RoutingFormResponseRepository";
import { getRoutingTraceService } from "@calcom/features/routing-trace/di/RoutingTraceService.container";
import type { RoutingStep } from "@calcom/features/routing-trace/repositories/RoutingTraceRepository.interface";
import { CrmRoutingTraceService } from "@calcom/features/routing-trace/services/CrmRoutingTraceService";
/* eslint-enable */
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

const returnNullValue = {
  email: null,
  recordType: null,
  crmAppSlug: null,
  recordId: null,
  crmTraceSteps: [] as RoutingStep[],
  pendingCrmTraceId: null as string | null,
};

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

async function savePendingCrmTrace(steps: RoutingStep[]): Promise<string | null> {
  if (steps.length === 0) return null;
  try {
    const record = await prisma.pendingRoutingTrace.create({
      data: { trace: steps as unknown as Prisma.InputJsonValue },
      select: { id: true },
    });
    return record.id;
  } catch (error) {
    log.warn("Failed to save pending CRM trace", safeStringify({ error }));
    return null;
  }
}

async function appendCrmStepsToExistingTrace(
  lookup: { formResponseId: number } | { queuedFormResponseId: string },
  steps: RoutingStep[]
): Promise<boolean> {
  if (steps.length === 0) return false;
  const routingTraceService = getRoutingTraceService();
  try {
    return await routingTraceService.appendStepsToPendingTrace(lookup, steps);
  } catch (error) {
    log.warn("Failed to append CRM steps to pending trace", safeStringify({ error }));
    return false;
  }
}

/** Returns the form response id or the queued response id */
function getRoutingFormResponseIdFromQuery(query: ParsedUrlQuery) {
  const routingFormResponseIdAsNumber = Number(query[ROUTING_FORM_RESPONSE_ID_QUERY_STRING]);
  const routingFormResponseId = isNaN(routingFormResponseIdAsNumber) ? null : routingFormResponseIdAsNumber;

  if (routingFormResponseId) return { routingFormResponseId, queuedFormResponseId: null };

  const queuedFormResponseId = query[ROUTING_FORM_QUEUED_RESPONSE_ID_QUERY_STRING];
  if (queuedFormResponseId && typeof queuedFormResponseId === "string")
    return { queuedFormResponseId, routingFormResponseId: null };

  return null;
}

async function getAttributeRoutingConfig(
  data:
    | {
        routingFormResponseId?: number | null;
        queuedFormResponseId?: string | null;
        eventTypeId: number;
      }
    | {
        route: Pick<LocalRoute, "attributeRoutingConfig">;
      }
) {
  if ("route" in data) {
    return data.route.attributeRoutingConfig ?? null;
  }
  const { routingFormResponseId, queuedFormResponseId } = data;
  const routingFormResponseRepository = new RoutingFormResponseRepository(prisma);

  const routingFormResponseQuery = routingFormResponseId
    ? await routingFormResponseRepository.findFormResponseIncludeForm({ routingFormResponseId })
    : queuedFormResponseId
      ? await routingFormResponseRepository.findQueuedFormResponseIncludeForm({ queuedFormResponseId })
      : null;

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
 * Uses the owner of the contact directly from CRM.
 * Wraps operations in a CRM trace context so routing decisions are captured.
 */
async function getOwnerEmailFromCrm(
  eventData: EventData,
  email: string
): Promise<{
  email: string | null;
  recordType: string | null;
  crmAppSlug: string | null;
  recordId: string | null;
  pendingCrmTraceId: string | null;
  crmTraceSteps: RoutingStep[];
}> {
  const routingTraceService = getRoutingTraceService();
  const crmTraceService = new CrmRoutingTraceService(routingTraceService);

  const result = await crmTraceService.runAsync(async () => {
    const crmContactOwner = await getCRMContactOwnerForRRLeadSkip(email, eventData.metadata);

    if (!crmContactOwner?.email) return returnNullValue;
    log.info(
      "[getOwnerEmailFromCrm] crmContactOwner",
      safeStringify({
        contactOwnerEmail: crmContactOwner.email,
        recordType: crmContactOwner.recordType,
        email,
        eventTypeId: eventData.id,
      })
    );
    const contactOwnerQuery = await findUserByEmailWhoIsAHostOfEventType({
      email: crmContactOwner.email,
      eventTypeId: eventData.id,
    });
    if (!contactOwnerQuery) {
      log.info(
        "[getOwnerEmailFromCrm] contactOwner not found as host, not considering it",
        safeStringify({ contactOwnerEmail: crmContactOwner.email, email, eventTypeId: eventData.id })
      );
      return returnNullValue;
    }
    return crmContactOwner;
  });

  const collectedSteps = routingTraceService.getCollectedSteps();
  const pendingCrmTraceId = await savePendingCrmTrace(collectedSteps);
  return { ...result, crmTraceSteps: collectedSteps, pendingCrmTraceId };
}

/**
 * Handles custom lookup field logic.
 * Wraps operations in a CRM trace context so routing decisions are captured.
 */
async function getTeamMemberEmailUsingRoutingFormHandler({
  bookerEmail,
  eventTypeId,
  attributeRoutingConfig,
  crmAppSlug,
  routingFormResponseId,
  queuedFormResponseId,
}: {
  bookerEmail: string;
  eventTypeId: number;
  attributeRoutingConfig: AttributeRoutingConfig | null;
  crmAppSlug: string;
  routingFormResponseId?: number | null;
  queuedFormResponseId?: string | null;
}) {
  const nullReturnValue = {
    email: null,
    skipContactOwner: false,
    recordType: "",
    recordId: "",
    crmTraceSteps: [] as RoutingStep[],
    pendingCrmTraceId: null as string | null,
  };

  if (!attributeRoutingConfig) return nullReturnValue;

  if (attributeRoutingConfig.skipContactOwner) return { ...nullReturnValue, skipContactOwner: true };

  const appBookingFormHandler = (await import("@calcom/app-store/routing-forms/appBookingFormHandler"))
    .default;
  const appHandler = appBookingFormHandler[crmAppSlug];
  if (!appHandler) return nullReturnValue;

  const hosts = await prisma.host.findMany({
    where: { eventTypeId },
    select: { user: { select: { email: true } } },
  });
  const hostEmails = new Set(hosts.map((h) => h.user.email.toLowerCase()));

  const routingTraceService = getRoutingTraceService();
  const crmTraceService = new CrmRoutingTraceService(routingTraceService);

  const result = await crmTraceService.runAsync(async () => {
    const {
      email: userEmail,
      recordType,
      recordId,
    } = await appHandler(bookerEmail, attributeRoutingConfig, eventTypeId, { hostEmails });

    if (!userEmail) return nullReturnValue;

    const userQuery = await findUserByEmailWhoIsAHostOfEventType({ email: userEmail, eventTypeId });

    if (!userQuery) return nullReturnValue;

    return { ...nullReturnValue, email: userEmail, recordType, recordId };
  });

  const collectedSteps = routingTraceService.getCollectedSteps();

  let pendingCrmTraceId: string | null = null;
  let traceLookup: { formResponseId: number } | { queuedFormResponseId: string } | null = null;
  if (routingFormResponseId) {
    traceLookup = { formResponseId: routingFormResponseId };
  } else if (queuedFormResponseId) {
    traceLookup = { queuedFormResponseId };
  }

  if (traceLookup) {
    const appended = await appendCrmStepsToExistingTrace(traceLookup, collectedSteps);
    if (!appended) {
      log.warn(
        "Could not append CRM steps to existing pending trace, creating standalone",
        safeStringify(traceLookup)
      );
      pendingCrmTraceId = await savePendingCrmTrace(collectedSteps);
    }
  } else {
    pendingCrmTraceId = await savePendingCrmTrace(collectedSteps);
  }

  return { ...result, crmTraceSteps: collectedSteps, pendingCrmTraceId };
}

async function getTeamMemberEmailForResponseOrContact({
  bookerEmail,
  eventData,
  routingFormResponseId,
  queuedFormResponseId,
  chosenRoute,
  crmAppSlug,
}: {
  bookerEmail: string;
  eventData: EventData;
  routingFormResponseId?: number | null;
  queuedFormResponseId?: string | null;
  /**
   * If provided, we won't go look for the route from DB.
   */
  chosenRoute?: LocalRoute;
  crmAppSlug?: string;
}): Promise<{
  email: string | null;
  recordType: string | null;
  crmAppSlug: string | null;
  recordId: string | null;
  pendingCrmTraceId: string | null;
}> {
  const eventTypeId = eventData.id;
  if (eventData.schedulingType !== SchedulingType.ROUND_ROBIN) return returnNullValue;

  const attributeRoutingConfigGetterData =
    routingFormResponseId || queuedFormResponseId
      ? { routingFormResponseId, queuedFormResponseId, eventTypeId }
      : chosenRoute
        ? { route: chosenRoute }
        : null;

  if (attributeRoutingConfigGetterData && crmAppSlug) {
    log.debug(
      "Using CRM App handler in routing-forms",
      safeStringify({ attributeRoutingConfigGetterData, crmAppSlug })
    );
    const attributeRoutingConfig = await getAttributeRoutingConfig(attributeRoutingConfigGetterData);
    const { email, skipContactOwner, recordType, recordId, pendingCrmTraceId } =
      await getTeamMemberEmailUsingRoutingFormHandler({
        bookerEmail,
        eventTypeId,
        attributeRoutingConfig,
        crmAppSlug,
        routingFormResponseId,
        queuedFormResponseId,
      });

    if (skipContactOwner) return returnNullValue;
    if (email) return { email, recordType, crmAppSlug, recordId, pendingCrmTraceId };
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
}): Promise<{
  email: string | null;
  recordType: string | null;
  crmAppSlug: string | null;
  recordId: string | null;
  pendingCrmTraceId: string | null;
}> {
  if (!query.email || typeof query.email !== "string") {
    return returnNullValue;
  }

  log.debug("getTeamMemberEmailForResponseOrContactUsingUrlQuery", safeStringify({ query }));

  const crmAppSlug = getEnabledRoutingFormAppSlugFromQuery(query);

  const routingFormResponseIdAndQueuedFormResponseId = getRoutingFormResponseIdFromQuery(query);

  return await getTeamMemberEmailForResponseOrContact({
    bookerEmail: query.email,
    eventData,
    chosenRoute,
    crmAppSlug,
    ...(routingFormResponseIdAndQueuedFormResponseId
      ? { ...routingFormResponseIdAndQueuedFormResponseId }
      : {}),
  });
}
