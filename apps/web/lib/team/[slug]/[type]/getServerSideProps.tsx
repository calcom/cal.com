import type { Prisma } from "@prisma/client";
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
        eventTypeId: eventData.id,
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
      teamMemberEmail: await getTeamMemberEmail(eventData, email as string),
    },
  };
};

async function getTeamMemberEmail(
  eventData: {
    id: number;
    isInstantEvent: boolean;
    schedulingType: SchedulingType | null;
    metadata: Prisma.JsonValue | null;
    length: number;
  },
  email?: string
): Promise<string | null> {
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
