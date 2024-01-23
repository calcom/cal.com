"use client";

import { Booker } from "@calcom/atoms";
import { getBookerWrapperClasses } from "@calcom/features/bookings/Booker/utils/getBookerWrapperClasses";
import { BookerSeo } from "@calcom/features/bookings/components/BookerSeo";

import type { AppProps } from "@lib/app-providers";
import { type PageProps } from "@lib/d/[link]/[slug]/getServerSideProps";

type TypePageComponentFunction = ((pageProps: PageProps) => JSX.Element) & {
  isBookingPage?: boolean;
  PageWrapper?: (props: AppProps) => JSX.Element;
};

const TypePageComponent: TypePageComponentFunction = function Type({
  slug,
  isEmbed,
  user,
  booking,
  away,
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
        isAway={away}
        hideBranding={isBrandingHidden}
        isTeamEvent={isTeamEvent}
        entity={entity}
        duration={duration}
        hashedLink={hashedLink}
      />
    </main>
  );
};

export default TypePageComponent;
