import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getBookingForReschedule, getMultipleDurationValue } from "@calcom/features/bookings/lib/get-booking";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { UserRepository } from "@calcom/lib/server/repository/user";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import { RedirectType } from "@calcom/prisma/enums";

import { getTemporaryOrgRedirect } from "@lib/getTemporaryOrgRedirect";
import type { inferSSRProps } from "@lib/types/inferSSRProps";
import type { EmbedProps } from "@lib/withEmbedSsr";

export type PageProps = inferSSRProps<typeof getServerSideProps> & EmbedProps;

async function getUserPageProps(context: GetServerSidePropsContext) {
  const session = await getServerSession(context);
  const { link, slug } = paramsSchema.parse(context.params);
  const { rescheduleUid, duration: queryDuration } = context.query;
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(context.req);
  const org = isValidOrgDomain ? currentOrgDomain : null;

  const { ssrInit } = await import("@server/lib/ssr");
  const ssr = await ssrInit(context);

  const hashedLink = await prisma.hashedLink.findUnique({
    where: {
      link,
    },
    select: {
      eventTypeId: true,
      eventType: {
        select: {
          users: {
            select: {
              username: true,
            },
          },
          team: {
            select: {
              id: true,
              slug: true,
              hideBranding: true,
            },
          },
        },
      },
    },
  });

  let name: string;
  let hideBranding = false;

  const notFound = {
    notFound: true,
  } as const;

  if (!hashedLink) {
    return notFound;
  }

  if (hashedLink.eventType.team) {
    name = hashedLink.eventType.team.slug || "";
    hideBranding = hashedLink.eventType.team.hideBranding;
  } else {
    const username = hashedLink.eventType.users[0]?.username;

    if (!username) {
      return notFound;
    }

    if (!org) {
      const redirect = await getTemporaryOrgRedirect({
        slugs: [username],
        redirectType: RedirectType.User,
        eventTypeSlug: slug,
        currentQuery: context.query,
      });

      if (redirect) {
        return redirect;
      }
    }

    const [user] = await UserRepository.findUsersByUsername({
      usernameList: [username],
      orgSlug: org,
    });

    if (!user) {
      return notFound;
    }

    name = username;
    hideBranding = user.hideBranding;
  }

  let booking: GetBookingType | null = null;
  if (rescheduleUid) {
    booking = await getBookingForReschedule(`${rescheduleUid}`, session?.user?.id);
  }

  const isTeamEvent = !!hashedLink.eventType?.team?.id;

  // We use this to both prefetch the query on the server,
  // as well as to check if the event exist, so we c an show a 404 otherwise.
  const eventData = await ssr.viewer.public.event.fetch({
    username: name,
    eventSlug: slug,
    isTeamEvent,
    org,
  });

  if (!eventData) {
    return notFound;
  }

  return {
    props: {
      entity: eventData.entity,
      duration: getMultipleDurationValue(
        eventData.metadata?.multipleDuration,
        queryDuration,
        eventData.length
      ),
      booking,
      user: name,
      slug,
      trpcState: ssr.dehydrate(),
      isBrandingHidden: hideBranding,
      // Sending the team event from the server, because this template file
      // is reused for both team and user events.
      isTeamEvent,
      hashedLink: link,
    },
  };
}

const paramsSchema = z.object({ link: z.string(), slug: z.string().transform((s) => slugify(s)) });

// Booker page fetches a tiny bit of data server side, to determine early
// whether the page should show an away state or dynamic booking not allowed.
export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  return await getUserPageProps(context);
};
