"use client";

import type { EmbedProps } from "app/WithEmbedSSR";
import { useSearchParams } from "next/navigation";

import { Booker } from "@calcom/atoms/monorepo";
import { BookerSeo } from "@calcom/features/bookings/components/BookerSeo";

import type { getServerSideProps } from "@lib/team/[slug]/[type]/getServerSideProps";
import type { inferSSRProps } from "@lib/types/inferSSRProps";

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
  booking,
  isEmbed,
  isBrandingHidden,
  eventData,
  isInstantMeeting,
  orgBannerUrl,
  teamMemberEmail,
  crmOwnerRecordType,
  crmAppSlug,
  isSEOIndexable,
}: PageProps) {
  const searchParams = useSearchParams();
  const { profile, users, hidden, title } = eventData;

  return (
    <>
      <BookerSeo
        username={user}
        eventSlug={slug}
        rescheduleUid={booking?.uid}
        hideBranding={isBrandingHidden}
        isTeamEvent
        eventData={
          profile && users && title && hidden !== undefined
            ? {
                profile,
                users,
                title,
                hidden,
              }
            : undefined
        }
        entity={eventData.entity}
        bookingData={booking}
        isSEOIndexable={isSEOIndexable}
      />
      <Booker
        username={user}
        eventSlug={slug}
        bookingData={booking}
        isInstantMeeting={isInstantMeeting}
        hideBranding={isBrandingHidden}
        isTeamEvent
        entity={{ ...eventData.entity, eventTypeId: eventData?.eventTypeId }}
        durationConfig={eventData.metadata?.multipleDuration}
        /* TODO: Currently unused, evaluate it is needed-
         *       Possible alternative approach is to have onDurationChange.
         */
        duration={getMultipleDurationValue(
          eventData.metadata?.multipleDuration,
          searchParams?.get("duration"),
          eventData.length
        )}
        orgBannerUrl={orgBannerUrl}
        teamMemberEmail={teamMemberEmail}
        crmOwnerRecordType={crmOwnerRecordType}
        crmAppSlug={crmAppSlug}
      />
    </>
  );
}

export default Type;
