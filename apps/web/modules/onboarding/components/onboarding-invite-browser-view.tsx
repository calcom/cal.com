"use client";

import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";

import { useOnboardingStore } from "../store/onboarding-store";

type OnboardingInviteBrowserViewProps = {
  teamName?: string;
};

export const OnboardingInviteBrowserView = ({ teamName }: OnboardingInviteBrowserViewProps) => {
  const { data: user } = trpc.viewer.me.get.useQuery();
  const { teamBrand } = useOnboardingStore();

  // Use default values if not provided
  const rawInviterName = user?.name || user?.username || "Alex";
  const displayInviterName = rawInviterName.charAt(0).toUpperCase() + rawInviterName.slice(1);
  const displayTeamName = teamName || "Deel";
  const teamAvatar = teamBrand.logo || null;

  return (
    <div className="bg-default border-subtle hidden h-full w-full flex-col rounded-l-2xl border xl:flex">
      {/* Browser header */}
      <div className="border-subtle flex min-w-0 shrink-0 items-center gap-3 rounded-t-2xl border-b bg-white p-3">
        {/* Navigation buttons */}
        <div className="flex shrink-0 items-center gap-4 opacity-50">
          <div className="h-3 w-3 rounded-full bg-gray-300" />
          <div className="h-3 w-3 rounded-full bg-gray-300" />
          <div className="h-3 w-3 rounded-full bg-gray-300" />
        </div>
        <div className="bg-muted flex w-full items-center gap-2 rounded-[32px] px-3 py-2">
          <div className="h-3 w-3 rounded-full bg-gray-400" />
          <p className="text-subtle text-xs font-medium leading-tight">mail.example.com</p>
        </div>
      </div>

      {/* Content */}
      <div className="bg-muted h-full pl-8 pt-8">
        <div className="bg-default border-subtle flex h-full w-full flex-col overflow-hidden rounded-tl-2xl border-l border-t">
          {/* Email Header */}
          <div className="border-subtle bg-muted flex flex-col gap-4 border-b p-8">
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
          <div className="bg-default flex-1 rounded-bl-2xl" />
        </div>
      </div>
    </div>
  );
};
