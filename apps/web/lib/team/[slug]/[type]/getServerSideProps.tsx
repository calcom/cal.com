import type { Prisma } from "@prisma/client";
import type { GetServerSidePropsContext } from "next";
import type { ParsedUrlQuery } from "querystring";
import { z } from "zod";

import { getCRMContactOwnerForRRLeadSkip } from "@calcom/app-store/_utils/CRMRoundRobinSkip";
import { ROUTING_FORM_RESPONSE_ID_QUERY_STRING } from "@calcom/app-store/routing-forms/lib/constants";
import { enabledAppSlugs } from "@calcom/app-store/routing-forms/lib/enabledApps";
import { zodRoutes as routesSchema } from "@calcom/app-store/routing-forms/zod";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import { getBookingForReschedule } from "@calcom/features/bookings/lib/get-booking";
import { getSlugOrRequestedSlug, orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import { RedirectType } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import { getTemporaryOrgRedirect } from "@lib/getTemporaryOrgRedirect";

import { ssrInit } from "@server/lib/ssr";

const paramsSchema = z.object({
  type: z.string().transform((s) => slugify(s)),
  slug: z.string().transform((s) => slugify(s)),
});

// Booker page fetches a tiny bit of data server side:
// 1. Check if team exists, to show 404
// 2. If rescheduling, get the booking details
export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { req, params, query } = context;
  const session = await getServerSession({ req });
  const { slug: teamSlug, type: meetingSlug } = paramsSchema.parse(params);
  const { rescheduleUid, isInstantMeeting: queryIsInstantMeeting, email } = query;
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(req, params?.orgSlug);
  const isOrgContext = currentOrgDomain && isValidOrgDomain;

  if (!isOrgContext) {
    const redirect = await getTemporaryOrgRedirect({
      slugs: teamSlug,
      redirectType: RedirectType.Team,
      eventTypeSlug: meetingSlug,
      currentQuery: context.query,
    });

    if (redirect) {
      return redirect;
    }
  }

  const team = await prisma.team.findFirst({
    where: {
      ...getSlugOrRequestedSlug(teamSlug),
      parent: isValidOrgDomain && currentOrgDomain ? getSlugOrRequestedSlug(currentOrgDomain) : null,
    },
    select: {
      id: true,
      hideBranding: true,
      parent: true,
      name: true,
      slug: true,
      eventTypes: {
        where: {
          slug: meetingSlug,
        },
        select: {
          id: true,
          isInstantEvent: true,
          schedulingType: true,
          metadata: true,
          length: true,
        },
      },
    },
  });

  if (!team || !team.eventTypes?.[0]) {
    return {
      notFound: true,
    } as const;
  }

  const eventData = team.eventTypes[0];
  const eventTypeId = eventData.id;

  let booking: GetBookingType | null = null;
  if (rescheduleUid) {
    booking = await getBookingForReschedule(`${rescheduleUid}`, session?.user?.id);
  }

  const ssr = await ssrInit(context);
  const fromRedirectOfNonOrgLink = context.query.orgRedirection === "true";
  const isUnpublished = team.parent ? !team.parent.slug : !team.slug;

  return {
    props: {
      eventData: {
        eventTypeId,
        entity: {
          fromRedirectOfNonOrgLink,
          considerUnpublished: isUnpublished && !fromRedirectOfNonOrgLink,
          orgSlug: isValidOrgDomain ? currentOrgDomain : null,
          teamSlug: team.slug ?? null,
          name: team.parent?.name ?? team.name ?? null,
        },
        length: eventData.length,
        metadata: EventTypeMetaDataSchema.parse(eventData.metadata),
      },
      booking,
      user: teamSlug,
      teamId: team.id,
      slug: meetingSlug,
      trpcState: ssr.dehydrate(),
      isBrandingHidden: team?.hideBranding,
      isInstantMeeting: eventData && queryIsInstantMeeting ? true : false,
      themeBasis: null,
      orgBannerUrl: team.parent?.bannerUrl ?? "",
      teamMemberEmail: await handleGettingTeamMemberEmail(query, eventTypeId, eventData),
    },
  };
};

interface EventData {
  id: number;
  isInstantEvent: boolean;
  schedulingType: SchedulingType | null;
  metadata: Prisma.JsonValue | null;
  length: number;
}

async function handleGettingTeamMemberEmail(
  query: ParsedUrlQuery,
  eventTypeId: number,
  eventData: EventData
) {
  if (
    !query.email ||
    typeof query.email !== "string" ||
    eventData.schedulingType !== SchedulingType.ROUND_ROBIN
  )
    return null;

  // Check if a routing form was completed and an routing form option is enabled
  if (
    ROUTING_FORM_RESPONSE_ID_QUERY_STRING in query &&
    Object.values(query).some((value) => value === "true")
  ) {
    const { email, skipContactOwner } = await handleRoutingFormOption(query, eventTypeId);

    if (skipContactOwner) return null;
    if (email) return email;
  } else {
    return await getTeamMemberEmail(eventData, query.email);
  }

  return null;
}

async function handleRoutingFormOption(query: ParsedUrlQuery, eventTypeId: number) {
  const nullReturnValue = { email: null, skipContactOwner: false };

  if (typeof query.email !== "string") return nullReturnValue;

  const routingFormQuery = await prisma.app_RoutingForms_Form.findFirst({
    where: {
      responses: {
        some: {
          id: Number(query[ROUTING_FORM_RESPONSE_ID_QUERY_STRING]),
        },
      },
    },
    select: {
      routes: true,
    },
  });

  if (!routingFormQuery || !routingFormQuery?.routes) return nullReturnValue;

  const parsedRoutes = routesSchema.safeParse(routingFormQuery.routes);

  if (!parsedRoutes.success || !parsedRoutes.data) return nullReturnValue;

  // Find the route with the attributeRoutingConfig
  const route = parsedRoutes.data.find((route) => {
    if ("action" in route) {
      return route.action.eventTypeId === eventTypeId;
    }
  });

  if (!route || !("attributeRoutingConfig" in route)) return nullReturnValue;

  // Get attributeRoutingConfig for the form
  const attributeRoutingConfig = route.attributeRoutingConfig;

  if (!attributeRoutingConfig) return nullReturnValue;

  // If the skipContactOwner is enabled then don't return an team member email
  if (attributeRoutingConfig?.skipContactOwner) return { ...nullReturnValue, skipContactOwner: true };

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

  if (!enabledRoutingFormApp) return nullReturnValue;

  const appBookingFormHandler = (await import("@calcom/app-store/routing-forms/appBookingFormHandler"))
    .default;
  const appHandler = appBookingFormHandler[enabledRoutingFormApp];

  if (!appHandler) return nullReturnValue;

  const { email: userEmail } = await appHandler(query.email, attributeRoutingConfig, eventTypeId);

  if (!userEmail) return nullReturnValue;

  // Determine if the user is a part of the event type
  const userQuery = await await prisma.user.findFirst({
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

async function getTeamMemberEmail(eventData: EventData, email: string): Promise<string | null> {
  // Pre-requisites
  if (!eventData || !email || eventData.schedulingType !== SchedulingType.ROUND_ROBIN) return null;
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
