"use client";

import { Booker } from "@calcom/atoms";
import { getBookerWrapperClasses } from "@calcom/features/bookings/Booker/utils/getBookerWrapperClasses";
import { BookerSeo } from "@calcom/features/bookings/components/BookerSeo";

import { getServerSideProps } from "@lib/team/[slug]/[type]/getServerSideProps";
import type { inferSSRProps } from "@lib/types/inferSSRProps";
import type { EmbedProps } from "@lib/withEmbedSsr";

import PageWrapper from "@components/PageWrapper";

export type PageProps = inferSSRProps<typeof getServerSideProps> & EmbedProps;

export { getServerSideProps };

export default function Type({
  slug,
  user,
  booking,
  away,
  isEmbed,
  isBrandingHidden,
  entity,
  duration,
  isInstantMeeting,
}: PageProps) {
  return (
    <main className={getBookerWrapperClasses({ isEmbed: !!isEmbed })}>
      <BookerSeo
        username={user}
        eventSlug={slug}
        rescheduleUid={booking?.uid}
        hideBranding={isBrandingHidden}
        isTeamEvent
        entity={entity}
        bookingData={booking}
      />
      <Booker
        username={user}
        eventSlug={slug}
        bookingData={booking}
        isAway={away}
        isInstantMeeting={isInstantMeeting}
        hideBranding={isBrandingHidden}
        isTeamEvent
        entity={entity}
        duration={duration}
      />
    </main>
  );
}

Type.PageWrapper = PageWrapper;
Type.isBookingPage = true;
