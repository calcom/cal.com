"use client";

import useTheme from "@calcom/lib/hooks/useTheme";
import { markdownToSafeHTMLClient } from "@calcom/lib/markdownToSafeHTMLClient";
import { Icon } from "@calcom/ui/components/icon";
import { PreviewBanner } from "@calcom/web/app/(booking-page-wrapper)/[user]/[type]/preview/preview-banner";

import type { TeamBookingPreviewPageProps } from "@server/lib/team/[slug]/[type]/getStaticPreviewProps";

export function TeamBookingPreview(props: TeamBookingPreviewPageProps) {
  const { eventType, team, entity } = props;

  // Use theme from team
  useTheme(team.theme);

  const organizationName = entity.name;
  const bookingUrl = `/team/${team.slug}/${eventType.slug}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-24">
      <main>
        {/* Preview Banner */}
        <PreviewBanner bookingUrl={bookingUrl} />

        {/* Event Type Header */}
        <div className="border-subtle bg-default text-default mb-8 rounded-xl border p-6">
          {/* Team Logo/Avatar */}
          <div className="mb-4">
            <div className="flex items-center">
              {team.logoUrl ? (
                <img src={team.logoUrl} alt={team.name} className="h-12 w-12 rounded-lg" />
              ) : (
                <div className="bg-emphasis flex h-12 w-12 items-center justify-center rounded-lg">
                  <Icon name="users" className="h-6 w-6" />
                </div>
              )}
              <div className="ml-3">
                <h2 className="text-emphasis font-semibold">{team.name}</h2>
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

            {eventType.schedulingType && (
              <span className="flex items-center">
                <Icon name="users" className="mr-1 h-4 w-4" />
                {eventType.schedulingType === "ROUND_ROBIN"
                  ? "Round Robin"
                  : eventType.schedulingType === "COLLECTIVE"
                  ? "Collective"
                  : "Team Event"}
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
