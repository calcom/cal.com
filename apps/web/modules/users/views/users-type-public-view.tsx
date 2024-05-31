"use client";

import { useSearchParams } from "next/navigation";

import { Booker } from "@calcom/atoms/monorepo";
import { getBookerWrapperClasses } from "@calcom/features/bookings/Booker/utils/getBookerWrapperClasses";
import { BookerSeo } from "@calcom/features/bookings/components/BookerSeo";

import { type PageProps } from "./users-type-public-view.getServerSideProps";

export const getMultipleDurationValue = (
  multipleDurationConfig: number[] | undefined,
  queryDuration: string | string[] | null | undefined,
  defaultValue: number
) => {
  if (!multipleDurationConfig) return null;
  if (multipleDurationConfig.includes(Number(queryDuration))) return Number(queryDuration);
  return defaultValue;
};

export default function Type({
  slug,
  user,
  isEmbed,
  booking,
  isBrandingHidden,
  isSEOIndexable,
  rescheduleUid,
  eventData,
  orgBannerUrl,
}: PageProps) {
  const searchParams = useSearchParams();

  return (
    <main className={getBookerWrapperClasses({ isEmbed: !!isEmbed })}>
      <BookerSeo
        username={user}
        eventSlug={slug}
        rescheduleUid={rescheduleUid ?? undefined}
        hideBranding={isBrandingHidden}
        isSEOIndexable={isSEOIndexable ?? true}
        entity={eventData.entity}
        bookingData={booking}
      />
      <Booker
        username={user}
        eventSlug={slug}
        bookingData={booking}
        hideBranding={isBrandingHidden}
        entity={eventData.entity}
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
  );
}
