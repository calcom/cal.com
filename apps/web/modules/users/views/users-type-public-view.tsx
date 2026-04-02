"use client";

import { getBookerWrapperClasses } from "@calcom/features/bookings/Booker/utils/getBookerWrapperClasses";
import { BookerWebWrapper as Booker } from "@calcom/web/modules/bookings/components/BookerWebWrapper";
import BookingPageErrorBoundary from "@components/error/BookingPageErrorBoundary";
import type { inferSSRProps } from "@lib/types/inferSSRProps";
import type { getServerSideProps } from "@server/lib/[user]/[type]/getServerSideProps";
import type { EmbedProps } from "app/WithEmbedSSR";
import { useSearchParams } from "next/navigation";

export type PageProps = inferSSRProps<typeof getServerSideProps> & EmbedProps;

export const getMultipleDurationValue = (
  multipleDurationConfig: number[] | undefined,
  queryDuration: string | string[] | null | undefined,
  defaultValue: number
) => {
  if (!multipleDurationConfig) return null;
  if (multipleDurationConfig.includes(Number(queryDuration))) return Number(queryDuration);
  return defaultValue;
};

function Type({ slug, user, isEmbed, booking, isBrandingHidden, eventData, orgBannerUrl }: PageProps) {
  const searchParams = useSearchParams();

  return (
    <BookingPageErrorBoundary>
      <main className={getBookerWrapperClasses({ isEmbed: !!isEmbed })}>
        <Booker
          username={user}
          eventSlug={slug}
          bookingData={booking}
          hideBranding={isBrandingHidden}
          eventData={eventData}
          entity={{ ...eventData.entity, eventTypeId: eventData?.id }}
          durationConfig={eventData.metadata?.multipleDuration}
          orgBannerUrl={orgBannerUrl}
          /* TODO: Currently unused, evaluate it is needed-
           *       Possible alternative approach is to have onDurationChange.
           */
          duration={getMultipleDurationValue(
            eventData.metadata?.multipleDuration,
            searchParams?.get("duration"),
            eventData.length
          )}
        />
      </main>
    </BookingPageErrorBoundary>
  );
}

export default Type;
