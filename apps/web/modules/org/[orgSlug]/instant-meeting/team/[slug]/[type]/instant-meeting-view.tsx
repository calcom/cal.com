"use client";

import { Booker } from "@calcom/atoms/monorepo";
import { getBookerWrapperClasses } from "@calcom/features/bookings/Booker/utils/getBookerWrapperClasses";
import { BookerSeo } from "@calcom/features/bookings/components/BookerSeo";

import type { getServerSideProps } from "@lib/org/[orgSlug]/instant-meeting/team/[slug]/[type]/getServerSideProps";
import type { inferSSRProps } from "@lib/types/inferSSRProps";
import type { EmbedProps } from "@lib/withEmbedSsr";

export type PageProps = inferSSRProps<typeof getServerSideProps> & EmbedProps;

function Type({ slug, user, booking, isEmbed, isBrandingHidden, entity, eventTypeId, duration }: PageProps) {
  return (
    <main className={getBookerWrapperClasses({ isEmbed: !!isEmbed })}>
      <BookerSeo
        username={user}
        eventSlug={slug}
        rescheduleUid={undefined}
        hideBranding={isBrandingHidden}
        isTeamEvent
        entity={entity}
        bookingData={booking}
      />
      <Booker
        username={user}
        eventSlug={slug}
        bookingData={booking}
        hideBranding={isBrandingHidden}
        isTeamEvent
        isInstantMeeting
        entity={{ ...entity, eventTypeId: eventTypeId }}
        duration={duration}
      />
    </main>
  );
}

Type.isBookingPage = true;

export default Type;
