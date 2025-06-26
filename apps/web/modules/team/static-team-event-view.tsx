"use client";

import { EventMeta } from "@calcom/features/bookings/Booker/components/EventMeta";
import { getBookerWrapperClasses } from "@calcom/features/bookings/Booker/utils/getBookerWrapperClasses";

import BookingPageErrorBoundary from "@components/error/BookingPageErrorBoundary";

interface StaticTeamEventViewProps {
  eventData: any;
  isBrandingHidden: boolean;
  orgBannerUrl: string;
  teamId: number;
  slug: string;
  user: string;
}

function StaticTeamEventView({
  eventData,
  isBrandingHidden,
  orgBannerUrl,
  teamId,
  slug,
  user,
}: StaticTeamEventViewProps) {
  return (
    <BookingPageErrorBoundary>
      <main className={getBookerWrapperClasses({ isEmbed: false })}>
        <div className="main text-default flex min-h-full w-full flex-col items-center">
          <div className="bg-default dark:bg-muted border-subtle grid max-w-full items-start rounded-md border dark:[color-scheme:dark] sm:transition-[width] sm:duration-300 sm:motion-reduce:transition-none md:flex-row">
            <div className="relative z-10 flex [grid-area:meta]">
              <div className="max-w-screen flex w-full flex-col md:w-[var(--booker-meta-width)]">
                {orgBannerUrl && (
                  <img
                    loading="eager"
                    className="-mb-9 h-16 object-cover object-top ltr:rounded-tl-md rtl:rounded-tr-md sm:h-auto"
                    alt="org banner"
                    src={orgBannerUrl}
                  />
                )}

                <EventMeta
                  event={eventData}
                  isPending={false}
                  isPlatform={false}
                  isPrivateLink={false}
                  locale="en"
                  timeZones={[]}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </BookingPageErrorBoundary>
  );
}

export default StaticTeamEventView;
