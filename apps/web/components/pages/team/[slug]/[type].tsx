"use client";

import { Booker } from "@calcom/atoms";
import { getBookerWrapperClasses } from "@calcom/features/bookings/Booker/utils/getBookerWrapperClasses";
import { BookerSeo } from "@calcom/features/bookings/components/BookerSeo";

import type { AppProps } from "@lib/app-providers";
import { type PageProps } from "@lib/team/[slug]/[type]/getServerSideProps";

const Type: React.FC<PageProps> & {
  PageWrapper?: AppProps["Component"]["PageWrapper"];
  isBookingPage?: boolean;
} = ({ slug, user, booking, away, isEmbed, isBrandingHidden, entity, duration, isInstantMeeting }) => {
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
};

export default Type;
