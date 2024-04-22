import { type GetServerSidePropsContext } from "next";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getBookingForReschedule, getBookingForSeatedEvent } from "@calcom/features/bookings/lib/get-booking";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { getUsernameList } from "@calcom/lib/defaultEvents";
import { UserRepository } from "@calcom/lib/server/repository/user";
import slugify from "@calcom/lib/slugify";
import { RedirectType } from "@calcom/prisma/client";

import { getTemporaryOrgRedirect } from "@lib/getTemporaryOrgRedirect";
import { type inferSSRProps } from "@lib/types/inferSSRProps";
import { type EmbedProps } from "@lib/withEmbedSsr";

export type PageProps = inferSSRProps<typeof getServerSideProps> & EmbedProps;

async function getDynamicGroupPageProps(context: GetServerSidePropsContext) {
  const session = await getServerSession(context);
  const { user: usernames, type: slug } = paramsSchema.parse(context.params);
  const { rescheduleUid, bookingUid } = context.query;

  const { ssrInit } = await import("@server/lib/ssr");
  const ssr = await ssrInit(context);
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(context.req, context.params?.orgSlug);
  const org = isValidOrgDomain ? currentOrgDomain : null;
  if (!org) {
    const redirect = await getTemporaryOrgRedirect({
      slugs: usernames,
      redirectType: RedirectType.User,
      eventTypeSlug: slug,
      currentQuery: context.query,
    });

    if (redirect) {
      return redirect;
    }
  }

  const usersInOrgContext = await UserRepository.findUsersByUsername({
    usernameList: usernames,
    orgSlug: isValidOrgDomain ? currentOrgDomain : null,
  });

  const users = usersInOrgContext;

  if (!users.length) {
    return {
      notFound: true,
    } as const;
  }

  let booking: GetBookingType | null = null;
  if (rescheduleUid) {
    booking = await getBookingForReschedule(`${rescheduleUid}`, session?.user?.id);
  } else if (bookingUid) {
    booking = await getBookingForSeatedEvent(`${bookingUid}`);
  }

  // We use this to both prefetch the query on the server,
  // as well as to check if the event exist, so we c an show a 404 otherwise.
  const eventData = await ssr.viewer.public.event.fetch({
    username: usernames.join("+"),
    eventSlug: slug,
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
        metadata: {
          ...eventData.metadata,
          multipleDuration: [15, 30, 60],
        },
      },
      booking,
      user: usernames.join("+"),
      slug,
      trpcState: ssr.dehydrate(),
      isBrandingHidden: false,
      isSEOIndexable: true,
      themeBasis: null,
      bookingUid: bookingUid ? `${bookingUid}` : null,
      rescheduleUid: rescheduleUid ? `${rescheduleUid}` : null,
      orgBannerUrl: null,
    },
  };
}

async function getUserPageProps(context: GetServerSidePropsContext) {
  const session = await getServerSession(context);
  const { user: usernames, type: slug } = paramsSchema.parse(context.params);
  const username = usernames[0];
  const { rescheduleUid, bookingUid } = context.query;
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(context.req, context.params?.orgSlug);

  const isOrgContext = currentOrgDomain && isValidOrgDomain;
  if (!isOrgContext) {
    const redirect = await getTemporaryOrgRedirect({
      slugs: usernames,
      redirectType: RedirectType.User,
      eventTypeSlug: slug,
      currentQuery: context.query,
    });

    if (redirect) {
      return redirect;
    }
  }

  const { ssrInit } = await import("@server/lib/ssr");
  const ssr = await ssrInit(context);
  const [user] = await UserRepository.findUsersByUsername({
    usernameList: [username],
    orgSlug: isValidOrgDomain ? currentOrgDomain : null,
  });

  if (!user) {
    return {
      notFound: true,
    } as const;
  }

  let booking: GetBookingType | null = null;
  if (rescheduleUid) {
    booking = await getBookingForReschedule(`${rescheduleUid}`, session?.user?.id);
  } else if (bookingUid) {
    booking = await getBookingForSeatedEvent(`${bookingUid}`);
  }

  const org = isValidOrgDomain ? currentOrgDomain : null;
  // We use this to both prefetch the query on the server,
  // as well as to check if the event exist, so we can show a 404 otherwise.
  const eventData = await ssr.viewer.public.event.fetch({
    username,
    eventSlug: slug,
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
      booking,
      eventData: {
        entity: eventData.entity,
        length: eventData.length,
        metadata: eventData.metadata,
      },
      user: username,
      slug,
      trpcState: ssr.dehydrate(),
      isBrandingHidden: user?.hideBranding,
      isSEOIndexable: user?.allowSEOIndexing,
      themeBasis: username,
      bookingUid: bookingUid ? `${bookingUid}` : null,
      rescheduleUid: rescheduleUid ? `${rescheduleUid}` : null,
      orgBannerUrl: eventData?.owner?.profile?.organization?.bannerUrl ?? null,
    },
  };
}

const paramsSchema = z.object({
  type: z.string().transform((s) => slugify(s)),
  user: z.string().transform((s) => getUsernameList(s)),
});

// Booker page fetches a tiny bit of data server side, to determine early
// whether the page should show an away state or dynamic booking not allowed.
export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { user } = paramsSchema.parse(context.params);
  const isDynamicGroup = user.length > 1;

  return isDynamicGroup ? await getDynamicGroupPageProps(context) : await getUserPageProps(context);
};
