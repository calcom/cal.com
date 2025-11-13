"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";

import { useOnboardingStore, type Invite } from "../store/onboarding-store";

type OnboardingInviteBrowserViewProps = {
  teamName?: string;
  /** If true, use organization invites instead of team invites */
  useOrganizationInvites?: boolean;
  /** Optional: Watched form invites to display in real-time. Takes precedence over store values. */
  watchedInvites?: Array<{
    email: string;
    team?: string;
    role?: string;
  }>;
};

type DisplayItem = {
  name: string;
  email: string;
  team: string;
  isReal?: boolean;
};

export const OnboardingInviteBrowserView = ({
  teamName,
  useOrganizationInvites = false,
  watchedInvites,
}: OnboardingInviteBrowserViewProps) => {
  const { data: user } = trpc.viewer.me.get.useQuery();
  const { teamBrand, teamInvites, invites, teamDetails } = useOnboardingStore();
  const { t } = useLocale();

  // Use default values if not provided
  const rawInviterName = user?.name || user?.username || "Alex";
  const displayInviterName = rawInviterName.charAt(0).toUpperCase() + rawInviterName.slice(1);
  const displayTeamName = teamName || "Deel";
  const teamAvatar = teamBrand.logo || null;

  // Get invites based on context - use watched invites if provided, otherwise fall back to store
  let actualInvites: Invite[] = [];
  if (watchedInvites) {
    // Transform watched invites to Invite format
    actualInvites = watchedInvites.map((invite) => ({
      email: invite.email,
      team: invite.team || (useOrganizationInvites ? "" : teamDetails.name),
      role: (invite.role as Invite["role"]) || "MEMBER",
    }));
  } else {
    // Fall back to store values
    actualInvites = useOrganizationInvites ? invites : teamInvites;
  }

  // Filter out empty invites (where email is empty or just whitespace)
  const validInvites = actualInvites.filter((invite) => invite.email && invite.email.trim().length > 0);

  // Create empty state items
  const emptyStateItem = {
    name: t("team_member"),
    email: "name@example.com",
    team: t("team"),
  };

  // Combine actual invites with empty state to fill up to 9 items

  const displayItems: DisplayItem[] = [];
  const maxItems = 9;

  // Add actual invites first
  for (let i = 0; i < validInvites.length && i < maxItems; i++) {
    const invite = validInvites[i];
    displayItems.push({
      name: invite.email.split("@")[0] || t("team_member"),
      email: invite.email,
      team: invite.team || t("team"),
      isReal: true,
    });
  }

  // Fill remaining slots with empty state
  const remainingSlots = maxItems - displayItems.length;
  for (let i = 0; i < remainingSlots; i++) {
    displayItems.push({
      name: emptyStateItem.name,
      email: emptyStateItem.email,
      team: emptyStateItem.team,
      isReal: false,
    });
  }

  return (
    <div className="bg-default border-subtle bg-muted hidden h-full w-full flex-col overflow-hidden rounded-l-2xl border xl:flex">
      {/* Content */}
      <div className="h-full px-6 pt-6">
        <div className="bg-default border-subtle flex flex-col gap-4 rounded-2xl border p-8">
          <div className="flex flex-col items-start gap-4">
            <Avatar
              size="lg"
              imageSrc={teamAvatar || undefined}
              alt={displayTeamName}
              className="border-default h-12 w-12 border-2"
            />
            <div className="flex w-full flex-col items-start gap-1">
              <h2 className="text-emphasis font-cal w-full text-left text-xl font-semibold leading-tight">
                {displayInviterName} invited you to join {displayTeamName}
              </h2>
              <p className="text-subtle text-left text-sm font-normal leading-tight">
                We're emailing you all the details
              </p>
            </div>
          </div>
        </div>

        {/* Email Body */}
        <div className="bg-default border-subtle mt-3 grid grid-cols-3 gap-4 rounded-t-2xl border p-6 opacity-60">
          {displayItems.map((item, index) => (
            <div
              key={`${item.email}-${index}`}
              className="bg-default border-subtle flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border p-4">
              <Avatar size="mdLg" imageSrc={undefined} alt={item.name} className="mt-4" />
              <div className="flex flex-col items-center gap-4">
                <div className="flex flex-col items-center">
                  <p className="text-default text-sm font-semibold leading-tight">{item.name}</p>
                  <p className="text-subtle text-xs font-medium leading-tight">{item.email}</p>
                </div>
                {item.team && (
                  <div className="bg-emphasis text-emphasis rounded-md px-2 py-0.5 text-xs">{item.team}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
