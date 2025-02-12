import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { getMultipleDurationValue } from "@calcom/features/bookings/lib/get-booking";
import { getSlugOrRequestedSlug } from "@calcom/features/ee/organizations/lib/orgDomains";
import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";

const paramsSchema = z.object({
  type: z.string().transform((s) => slugify(s)),
  slug: z.string().transform((s) => slugify(s)),
});

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { slug: teamSlug, type: meetingSlug } = paramsSchema.parse(context.params);
  const { duration: queryDuration } = context.query;

  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(context.req, context.params?.orgSlug);

  const team = await prisma.team.findFirst({
    where: {
      ...getSlugOrRequestedSlug(teamSlug),
      parent: isValidOrgDomain && currentOrgDomain ? getSlugOrRequestedSlug(currentOrgDomain) : null,
    },
    select: {
      id: true,
      hideBranding: true,
    },
  });

  if (!team) {
    return {
      notFound: true,
    } as const;
  }

  const org = isValidOrgDomain ? currentOrgDomain : null;

  const { ssrInit } = await import("@server/lib/ssr");
  const ssr = await ssrInit(context);
  const eventData = await ssr.viewer.public.event.fetch({
    username: teamSlug,
    eventSlug: meetingSlug,
    isTeamEvent: true,
    org,
    fromRedirectOfNonOrgLink: context.query.orgRedirection === "true",
  });

  if (!eventData || !org) {
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
      trpcState: ssr.dehydrate(),
      isBrandingHidden: team?.hideBranding,
      themeBasis: null,
    },
  };
};
