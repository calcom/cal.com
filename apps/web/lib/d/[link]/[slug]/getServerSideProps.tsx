import type { EmbedProps } from "app/WithEmbedSSR";
import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getBookingForReschedule, getMultipleDurationValue } from "@calcom/features/bookings/lib/get-booking";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { shouldHideBrandingForTeamEvent, shouldHideBrandingForUserEvent } from "@calcom/lib/hideBranding";
import { EventRepository } from "@calcom/lib/server/repository/event";
import { UserRepository } from "@calcom/lib/server/repository/user";
import { HashedLinkService } from "@calcom/lib/server/service/hashedLinkService";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import { RedirectType } from "@calcom/prisma/enums";

import { getTemporaryOrgRedirect } from "@lib/getTemporaryOrgRedirect";
import type { inferSSRProps } from "@lib/types/inferSSRProps";

export type PageProps = inferSSRProps<typeof getServerSideProps> & EmbedProps;

async function getUserPageProps(context: GetServerSidePropsContext) {
  const session = await getServerSession({ req: context.req });
  const { link, slug } = paramsSchema.parse(context.params);
  const { rescheduleUid, duration: queryDuration } = context.query;
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(context.req);
  const org = isValidOrgDomain ? currentOrgDomain : null;

  let name: string;
  let hideBranding = false;

  const notFound = {
    notFound: true,
  } as const;

  // Use centralized validation logic to avoid duplication
  const hashedLinkService = new HashedLinkService();
  try {
    await hashedLinkService.validate(link);
  } catch (error) {
    // Link is expired, invalid, or doesn't exist
    return notFound;
  }

  // If validation passes, fetch the complete data needed for rendering
  const hashedLink = await hashedLinkService.findLinkWithDetails(link);

  if (!hashedLink) {
    return notFound;
  }

  const username = hashedLink.eventType.users[0]?.username;
  const profileUsername = hashedLink.eventType.users[0]?.profiles[0]?.username;

  if (hashedLink.eventType.team) {
    name = hashedLink.eventType.team.slug || "";
    hideBranding = shouldHideBrandingForTeamEvent({
      eventTypeId: hashedLink.eventTypeId,
      team: hashedLink.eventType.team,
    });
  } else {
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

    name = profileUsername || username;

    const userRepo = new UserRepository(prisma);
    const [user] = await userRepo.findUsersByUsername({
      usernameList: [name],
      orgSlug: org,
    });

    if (!user) {
      return notFound;
    }

    hideBranding = shouldHideBrandingForUserEvent({
      eventTypeId: hashedLink.eventTypeId,
      owner: user,
    });
  }

  let booking: GetBookingType | null = null;
  if (rescheduleUid) {
    booking = await getBookingForReschedule(`${rescheduleUid}`, session?.user?.id);
  }

  const isTeamEvent = !!hashedLink.eventType?.team?.id;

  const eventData = await EventRepository.getPublicEvent(
    {
      username: name,
      eventSlug: slug,
      isTeamEvent,
      org,
      fromRedirectOfNonOrgLink: context.query.orgRedirection === "true",
    },
    session?.user?.id
  );

  if (!eventData) {
    return notFound;
  }

  // Check if team has API v2 feature flag enabled (same logic as team pages)
  let useApiV2 = false;
  if (isTeamEvent && hashedLink.eventType.team?.id) {
    const featureRepo = new FeaturesRepository();
    const teamHasApiV2Route = await featureRepo.checkIfTeamHasFeature(
      hashedLink.eventType.team.id,
      "use-api-v2-for-team-slots"
    );
    useApiV2 = teamHasApiV2Route;
  }

  return {
    props: {
      useApiV2,
      eventData,
      entity: eventData.entity,
      duration: getMultipleDurationValue(
        eventData.metadata?.multipleDuration,
        queryDuration,
        eventData.length
      ),
      durationConfig: eventData.metadata?.multipleDuration ?? [],
      booking,
      user: name,
      slug,
      isBrandingHidden: hideBranding,
      // Sending the team event from the server, because this template file
      // is reused for both team and user events.
      isTeamEvent,
      hashedLink: hashedLink?.link,
    },
  };
}

const paramsSchema = z.object({ link: z.string(), slug: z.string().transform((s) => slugify(s)) });

// Booker page fetches a tiny bit of data server side, to determine early
// whether the page should show an away state or dynamic booking not allowed.
export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  return await getUserPageProps(context);
};
