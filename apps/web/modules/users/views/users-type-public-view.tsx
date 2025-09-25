"use client";

import type { EmbedProps } from "app/WithEmbedSSR";
import Head from "next/head";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { BookerWebWrapper as Booker } from "@calcom/atoms/booker";
import { getBookerWrapperClasses } from "@calcom/features/bookings/Booker/utils/getBookerWrapperClasses";

import type { inferSSRProps } from "@lib/types/inferSSRProps";

import BookingPageErrorBoundary from "@components/error/BookingPageErrorBoundary";

import type { getServerSideProps } from "@server/lib/[user]/[type]/getServerSideProps";

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

function Type({
  slug,
  user,
  userBannerUrl,
  isEmbed,
  booking,
  isBrandingHidden,
  eventData,
  orgBannerUrl,
  eventTypes,
  brandColor,
  faviconUrl,
}: PageProps) {
  const searchParams = useSearchParams();
  console.log("faviconUrl", faviconUrl);

  useEffect(() => {
    const defaultFavicons = document.querySelectorAll('link[rel="icon"]');
    console.log("Removing default favicons: ", defaultFavicons);
    defaultFavicons.forEach((link) => {
      link.rel = "icon";
      // }
      link.href = faviconUrl;
      link.type = "image/png";
    });
    if (defaultFavicons.length === 0) {
      const link: HTMLLinkElement = document.createElement("link");
      link.rel = "icon";
      link.href = faviconUrl ?? "/favicon.ico";
      link.type = "image/png";
      document.head.appendChild(link);
    }

    console.log("Links are: ", defaultFavicons);
  }, [faviconUrl]);

  return (
    <>
      {faviconUrl && (
        <Head>
          <link rel="icon" href={faviconUrl} type="image/x-icon" />
        </Head>
      )}
      <BookingPageErrorBoundary>
        <main className={getBookerWrapperClasses({ isEmbed: !!isEmbed })}>
          <Booker
            username={user}
            brandColor={brandColor}
            eventSlug={slug}
            bookingData={booking}
            hideBranding={isBrandingHidden}
            eventData={eventData}
            entity={{ ...eventData.entity, eventTypeId: eventData?.id }}
            durationConfig={eventData.metadata?.multipleDuration}
            orgBannerUrl={orgBannerUrl || userBannerUrl}
            eventTypes={eventTypes}
            /* TODO: Currently unused, evaluate it is needed-
             *       Possible alternative approach is to have onDurationChange.
             */
            billingAddressRequired={eventData.metadata?.billingAddressRequired}
            duration={getMultipleDurationValue(
              eventData.metadata?.multipleDuration,
              searchParams?.get("duration"),
              eventData.length
            )}
          />
        </main>
      </BookingPageErrorBoundary>
    </>
  );
}

export default Type;
