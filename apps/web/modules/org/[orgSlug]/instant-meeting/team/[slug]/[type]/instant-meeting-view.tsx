"use client";

import type { EmbedProps } from "app/WithEmbedSSR";

import { Booker } from "@calcom/atoms/monorepo";
import { getBookerWrapperClasses } from "@calcom/features/bookings/Booker/utils/getBookerWrapperClasses";

import type { getServerSideProps } from "@lib/org/[orgSlug]/instant-meeting/team/[slug]/[type]/getServerSideProps";
import type { inferSSRProps } from "@lib/types/inferSSRProps";

export type Props = inferSSRProps<typeof getServerSideProps> & EmbedProps;

function Type({ slug, user, booking, isEmbed, isBrandingHidden, entity, eventTypeId, duration }: Props) {
  return (
    <main className={getBookerWrapperClasses({ isEmbed: !!isEmbed })}>
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

export default Type;
