"use client";

import { Booker } from "@calcom/atoms/monorepo";
import { getBookerWrapperClasses } from "@calcom/features/bookings/Booker/utils/getBookerWrapperClasses";
import { BookerSeo } from "@calcom/features/bookings/components/BookerSeo";

import { getServerSideProps, type PageProps } from "@lib/d/[link]/[slug]/getServerSideProps";

import PageWrapper from "@components/PageWrapper";

export default function Type({
  slug,
  isEmbed,
  user,
  booking,
  isBrandingHidden,
  isTeamEvent,
  entity,
  duration,
  hashedLink,
}: PageProps) {
  return (
    <main className={getBookerWrapperClasses({ isEmbed: !!isEmbed })}>
      <BookerSeo
        username={user}
        eventSlug={slug}
        rescheduleUid={booking?.uid}
        hideBranding={isBrandingHidden}
        entity={entity}
      />
      <Booker
        username={user}
        eventSlug={slug}
        bookingData={booking}
        hideBranding={isBrandingHidden}
        isTeamEvent={isTeamEvent}
        entity={entity}
        duration={duration}
        hashedLink={hashedLink}
      />
    </main>
  );
}

export { getServerSideProps };

Type.PageWrapper = PageWrapper;
Type.isBookingPage = true;
