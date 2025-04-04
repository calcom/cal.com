import type { GetServerSidePropsContext } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getMultipleDurationValue } from "@calcom/features/bookings/lib/get-booking";
import { getSlugOrRequestedSlug } from "@calcom/features/ee/organizations/lib/orgDomains";
import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { EventTypeRepository } from "@calcom/lib/server/repository/eventType";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";

const paramsSchema = z.object({
  type: z.string().transform((s) => slugify(s)),
  slug: z.string().transform((s) => slugify(s)),
});

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const session = await getServerSession({ req: context.req });
  if (!session?.user?.id) {
    redirect("/auth/login");
  }
  const sessionUserId = session.user.id;
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

  const eventData = await EventTypeRepository.getPublicEvent(
    {
      username: teamSlug,
      eventSlug: meetingSlug,
      isTeamEvent: true,
      org,
      fromRedirectOfNonOrgLink: context.query.orgRedirection === "true",
    },
    sessionUserId
  );
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
      isBrandingHidden: team?.hideBranding,
      themeBasis: null,
    },
  };
};
