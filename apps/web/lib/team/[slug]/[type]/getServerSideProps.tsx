import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { getCRMContactOwnerForRRLeadSkip } from "@calcom/app-store/_utils/CRMRoundRobinSkip";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import { getBookingForReschedule } from "@calcom/features/bookings/lib/get-booking";
import { getSlugOrRequestedSlug, orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import { RedirectType } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc";

import { getTemporaryOrgRedirect } from "@lib/getTemporaryOrgRedirect";

const paramsSchema = z.object({
  type: z.string().transform((s) => slugify(s)),
  slug: z.string().transform((s) => slugify(s)),
});

// Booker page fetches a tiny bit of data server side:
// 1. Check if team exists, to show 404
// 2. If rescheduling, get the booking details
export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const session = await getServerSession(context);
  const { slug: teamSlug, type: meetingSlug } = paramsSchema.parse(context.params);
  const {
    rescheduleUid,
    duration: queryDuration,
    isInstantMeeting: queryIsInstantMeeting,
    email,
  } = context.query;
  const { ssrInit } = await import("@server/lib/ssr");
  const ssr = await ssrInit(context);
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(context.req, context.params?.orgSlug);
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
    },
  });

  if (!team) {
    return {
      notFound: true,
    } as const;
  }

  let booking: GetBookingType | null = null;
  if (rescheduleUid) {
    booking = await getBookingForReschedule(`${rescheduleUid}`, session?.user?.id);
  }

  const org = isValidOrgDomain ? currentOrgDomain : null;
  // We use this to both prefetch the query on the server,
  // as well as to check if the event exist, so we c an show a 404 otherwise.
  const eventData = await ssr.viewer.public.event.fetch({
    username: teamSlug,
    eventSlug: meetingSlug,
    isTeamEvent: true,
    org,
    fromRedirectOfNonOrgLink: context.query.orgRedirection === "true",
  });

  if (!eventData) {
    return {
      notFound: true,
    } as const;
  }

  return {
    props: {
      eventData: {
        entity: eventData.entity,
        length: eventData.length,
        metadata: eventData.metadata,
      },
      booking,
      user: teamSlug,
      teamId: team.id,
      slug: meetingSlug,
      trpcState: ssr.dehydrate(),
      isBrandingHidden: team?.hideBranding,
      isInstantMeeting: eventData.isInstantEvent && queryIsInstantMeeting ? true : false,
      themeBasis: null,
      orgBannerUrl: eventData?.team?.parent?.bannerUrl ?? "",
      teamMemberEmail: await getTeamMemberEmail(eventData, email as string),
    },
  };
};

type EventData = RouterOutputs["viewer"]["public"]["event"];

async function getTeamMemberEmail(eventData: EventData, email?: string): Promise<string | null> {
  // Pre-requisites
  if (!eventData || !email || eventData.schedulingType !== SchedulingType.ROUND_ROBIN) return null;
  const crmContactOwnerEmail = await getCRMContactOwnerForRRLeadSkip(email, eventData.id);
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
