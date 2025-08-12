import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getMultipleDurationValue } from "@calcom/features/bookings/lib/get-booking";
import { getSlugOrRequestedSlug, getOrgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { shouldHideBrandingForTeamEvent } from "@calcom/lib/hideBranding";
import { EventRepository } from "@calcom/lib/server/repository/event";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";

import type { NextJsLegacyContext } from "@lib/buildLegacyCtx";

const paramsSchema = z.object({
  type: z.string().transform((s) => slugify(s)),
  slug: z.string().transform((s) => slugify(s)),
});

export const getServerSideProps = async (context: NextJsLegacyContext) => {
  const { slug: teamSlug, type: meetingSlug } = paramsSchema.parse(context.params);
  const { duration: queryDuration } = context.query;

  const hostname = context.req.headers.host || "";
  const forcedSlugHeader = context.req.headers["x-cal-force-slug"];
  const forcedSlug = Array.isArray(forcedSlugHeader) ? forcedSlugHeader[0] : forcedSlugHeader;
  const { currentOrgDomain, isValidOrgDomain } = getOrgDomainConfig({
    hostname,
    forcedSlug: forcedSlug || context.params?.orgSlug,
    isPlatform: !!context.req.headers["x-cal-client-id"],
  });

  const team = await prisma.team.findFirst({
    where: {
      ...getSlugOrRequestedSlug(teamSlug),
      parent: isValidOrgDomain && currentOrgDomain ? getSlugOrRequestedSlug(currentOrgDomain) : null,
    },
    select: {
      id: true,
      hideBranding: true,
      parent: {
        select: {
          hideBranding: true,
        },
      },
    },
  });

  if (!team) {
    return {
      notFound: true,
    } as const;
  }

  const org = isValidOrgDomain ? currentOrgDomain : null;
  if (!org) {
    return {
      notFound: true,
    } as const;
  }
  const reqForSession = {
    headers: context.req.headers,
    cookies: context.req.cookies,
  } as any;
  const session = await getServerSession({ req: reqForSession });
  const eventData = await EventRepository.getPublicEvent(
    {
      username: teamSlug,
      eventSlug: meetingSlug,
      isTeamEvent: true,
      org,
      fromRedirectOfNonOrgLink: context.query.orgRedirection === "true",
    },
    session?.user?.id
  );

  if (!eventData) {
    return {
      notFound: true,
    } as const;
  }

  return {
    props: {
      eventData,
      entity: eventData.entity,
      eventTypeId: eventData.id,
      duration: getMultipleDurationValue(
        eventData.metadata?.multipleDuration,
        queryDuration,
        eventData.length
      ),
      booking: null,
      user: teamSlug,
      teamId: team.id,
      slug: meetingSlug,
      isBrandingHidden: shouldHideBrandingForTeamEvent({
        eventTypeId: eventData.id,
        team,
      }),
      themeBasis: null,
    },
  };
};
