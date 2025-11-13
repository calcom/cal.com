"use client";

import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";

import { useOnboardingStore } from "../store/onboarding-store";

type OnboardingInviteBrowserViewProps = {
  teamName?: string;
};

const EmptyStateTeams = Array.from({ length: 9 }, () => ({
  name: "team_member",
  email: "name@example.com",
  team: "Team",
}));

export const OnboardingInviteBrowserView = ({ teamName }: OnboardingInviteBrowserViewProps) => {
  const { data: user } = trpc.viewer.me.get.useQuery();
  const { teamBrand } = useOnboardingStore();

  // Use default values if not provided
  const rawInviterName = user?.name || user?.username || "Alex";
  const displayInviterName = rawInviterName.charAt(0).toUpperCase() + rawInviterName.slice(1);
  const displayTeamName = teamName || "Deel";
  const teamAvatar = teamBrand.logo || null;

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
          {EmptyStateTeams.map((team) => (
            <div
              key={team.name}
              className="bg-default border-subtle flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border p-4">
              <Avatar size="sm" imageSrc={team.avatar} alt={team.name} />
              <div className="flex flex-col items-center gap-1">
                <p className="text-default text-sm font-semibold leading-tight">{team.name}</p>
                <p className="text-subtle text-xs font-medium leading-tight">{team.email}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
