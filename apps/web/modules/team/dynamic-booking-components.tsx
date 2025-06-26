"use client";

import { BookerWebWrapper as Booker } from "@calcom/atoms/booker";

interface DynamicBookingComponentsProps {
  eventData: any;
  teamId: number;
  slug: string;
  user: string;
  isBrandingHidden: boolean;
  orgBannerUrl: string;
}

function DynamicBookingComponents({
  eventData,
  teamId,
  slug,
  user,
  isBrandingHidden,
  orgBannerUrl,
}: DynamicBookingComponentsProps) {
  return (
    <div className="dynamic-booking-section">
      <Booker
        username={user}
        eventSlug={slug}
        hideBranding={isBrandingHidden}
        isTeamEvent
        entity={{ ...eventData.entity, eventTypeId: eventData?.eventTypeId }}
        durationConfig={eventData.metadata?.multipleDuration}
        orgBannerUrl={orgBannerUrl}
        eventData={eventData}
      />
    </div>
  );
}

export default DynamicBookingComponents;
