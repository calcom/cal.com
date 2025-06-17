"use client";

import useTheme from "@calcom/lib/hooks/useTheme";
import { Icon } from "@calcom/ui/components/icon";

import type { BookingPreviewPageProps } from "@server/lib/[user]/[type]/getStaticPreviewProps";

export function UserBookingPreview(props: BookingPreviewPageProps) {
  const { eventType, profile, entity } = props;

  // Use theme from profile
  useTheme(profile.theme);

  const organizationName = entity.name;

  return (
    <div className="mx-auto max-w-3xl px-4 py-24">
      <main>
        {/* Event Type Header */}
        <div className="border-subtle bg-default text-default mb-8 rounded-xl border p-6">
          {/* User Avatar */}
          <div className="mb-4">
            <div className="flex items-center">
              <img src={profile.image} alt={profile.name} className="h-12 w-12 rounded-full" />
              <div className="ml-3">
                <h2 className="text-emphasis font-semibold">{profile.name}</h2>
                {organizationName && <p className="text-subtle text-sm">{organizationName}</p>}
              </div>
            </div>
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
          </div>

          {eventType.description && (
            <div className="text-default text-sm">
              <p>{eventType.description}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
