"use client";

import { getBookerWrapperClasses } from "@calcom/features/bookings/Booker/utils/getBookerWrapperClasses";
import { BookerWebWrapper as Booker } from "@calcom/web/modules/bookings/components/BookerWebWrapper";
import BookingPageErrorBoundary from "@components/error/BookingPageErrorBoundary";
import type { PageProps } from "@lib/d/[link]/[slug]/getServerSideProps";

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
  eventData,
  useApiV2,
}: PageProps) {
  return (
    <BookingPageErrorBoundary>
      <main className={getBookerWrapperClasses({ isEmbed: !!isEmbed })}>
        <Booker
          eventData={eventData}
          username={user}
          eventSlug={slug}
          bookingData={booking}
          hideBranding={isBrandingHidden}
          isTeamEvent={isTeamEvent}
          entity={entity}
          duration={duration}
          hashedLink={hashedLink}
          durationConfig={durationConfig}
          useApiV2={useApiV2}
        />
      </main>
    </BookingPageErrorBoundary>
  );
}
