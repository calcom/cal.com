"use client";

import { Booker } from "@calcom/atoms/monorepo";
import { getBookerWrapperClasses } from "@calcom/features/bookings/Booker/utils/getBookerWrapperClasses";

import { type PageProps } from "@lib/d/[link]/[slug]/getServerSideProps";

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
  );
}
