"use client";

import { markdownToSafeHTMLClient } from "@calcom/lib/markdownToSafeHTMLClient";
import { Icon } from "@calcom/ui/components/icon";

import type { BookingPreviewPageProps } from "@server/lib/[user]/[type]/getStaticPreviewProps";

import { PreviewBanner } from "./preview-banner";

export function UserBookingPreview(props: BookingPreviewPageProps) {
  const { eventType, profile, profiles, organizationName, isDynamicGroup } = props;
  const bookingUrl =
    isDynamicGroup && profiles
      ? `/${profiles.map((p) => p.username).join("+")}/${eventType.slug}`
      : `/${profile.username}/${eventType.slug}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-24">
      <main>
        {/* Preview Banner */}
        <PreviewBanner bookingUrl={bookingUrl} />

        {/* Event Type Header */}
        <div className="border-subtle bg-default text-default mb-8 rounded-xl border p-6">
          {/* User Avatar(s) */}
          <div className="mb-4">
            {isDynamicGroup && profiles ? (
              <div className="flex items-center">
                <div className="flex -space-x-2">
                  {profiles.slice(0, 4).map((userProfile, index) => (
                    <img
                      key={userProfile.username}
                      src={userProfile.image}
                      alt={userProfile.name}
                      className="h-12 w-12 rounded-full border-2 border-white"
                      style={{ zIndex: profiles.length - index }}
                    />
                  ))}
                  {profiles.length > 4 && (
                    <div className="bg-subtle flex h-12 w-12 items-center justify-center rounded-full border-2 border-white text-sm font-medium">
                      +{profiles.length - 4}
                    </div>
                  )}
                </div>
                <div className="ml-3">
                  <h2 className="text-emphasis font-semibold">{profiles.map((p) => p.name).join(", ")}</h2>
                  {organizationName && <p className="text-subtle text-sm">{organizationName}</p>}
                </div>
              </div>
            ) : (
              <div className="flex items-center">
                <img src={profile.image} alt={profile.name} className="h-12 w-12 rounded-full" />
                <div className="ml-3">
                  <h2 className="text-emphasis font-semibold">{profile.name}</h2>
                  {organizationName && <p className="text-subtle text-sm">{organizationName}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Event Type Info */}
          <h1 className="font-cal text-emphasis mb-2 text-2xl">{eventType.title}</h1>

          <div className="text-default mb-4 flex items-center space-x-4 text-sm">
            <span className="flex items-center">
              <Icon name="clock" className="mr-1 h-4 w-4" />
              {eventType.length} min
            </span>

            {eventType.price > 0 && (
              <span className="flex items-center">
                <Icon name="credit-card" className="mr-1 h-4 w-4" />
                {eventType.currency} {eventType.price}
              </span>
            )}

            {eventType.requiresConfirmation && (
              <span className="flex items-center">
                <Icon name="user-check" className="mr-1 h-4 w-4" />
                Requires confirmation
              </span>
            )}

            {isDynamicGroup && (
              <span className="flex items-center">
                <Icon name="users" className="mr-1 h-4 w-4" />
                Group Meeting
              </span>
            )}
          </div>

          {eventType.description && (
            <div className="text-default text-sm">
              <div
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{
                  __html: markdownToSafeHTMLClient(eventType.description),
                }}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
