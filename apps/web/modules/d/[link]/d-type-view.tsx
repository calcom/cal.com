"use client";

import { BookerWebWrapper as Booker } from "@calcom/atoms/booker";
import { getBookerWrapperClasses } from "@calcom/features/bookings/Booker/utils/getBookerWrapperClasses";

import { type PageProps } from "@lib/d/[link]/[slug]/getServerSideProps";

import BookingPageErrorBoundary from "@components/error/BookingPageErrorBoundary";

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
  durationConfig,
}: PageProps) {
  return (
    <BookingPageErrorBoundary>
      <main className={getBookerWrapperClasses({ isEmbed: !!isEmbed })}>
        <Booker
          username={user}
          eventSlug={slug}
          bookingData={booking}
          hideBranding={isBrandingHidden}
          isTeamEvent={isTeamEvent}
          entity={entity}
          duration={duration}
          hashedLink={hashedLink}
          durationConfig={durationConfig}
        />
      </main>
    </BookingPageErrorBoundary>
  );
}
