"use client";

import type { EmbedProps } from "app/WithEmbedSSR";

import { BookerWebWrapper as Booker } from "@calcom/web/modules/bookings/components/BookerWebWrapper";
import { getBookerWrapperClasses } from "@calcom/features/bookings/Booker/utils/getBookerWrapperClasses";

import type { getServerSideProps } from "@lib/org/[orgSlug]/instant-meeting/team/[slug]/[type]/getServerSideProps";
import type { inferSSRProps } from "@lib/types/inferSSRProps";

import BookingPageErrorBoundary from "@components/error/BookingPageErrorBoundary";

export type Props = inferSSRProps<typeof getServerSideProps> & EmbedProps;

function Type({
  slug,
  user,
  booking,
  isEmbed,
  isBrandingHidden,
  entity,
  eventTypeId,
  duration,
  eventData,
}: Props) {
  return (
    <BookingPageErrorBoundary>
      <main className={getBookerWrapperClasses({ isEmbed: !!isEmbed })}>
        <Booker
          username={user}
          eventSlug={slug}
          eventData={eventData}
          bookingData={booking}
          hideBranding={isBrandingHidden}
          isTeamEvent
          isInstantMeeting
          entity={{ ...entity, eventTypeId: eventTypeId }}
          duration={duration}
        />
      </main>
    </BookingPageErrorBoundary>
  );
}

export default Type;
