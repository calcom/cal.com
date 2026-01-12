"use client";

import { useRouter, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import React, { useEffect } from "react";

import { useFlags } from "@calcom/features/flags/hooks";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";

import { InviteOptions } from "~/onboarding/components/InviteOptions";
import { OnboardingCard } from "~/onboarding/components/OnboardingCard";
import { OnboardingLayout } from "~/onboarding/components/OnboardingLayout";
import { OnboardingInviteBrowserView } from "~/onboarding/components/onboarding-invite-browser-view";
import { useCreateTeam } from "~/onboarding/hooks/useCreateTeam";
import { useOnboardingStore } from "~/onboarding/store/onboarding-store";

import { CSVUploadModal } from "./csv-upload-modal";

type TeamInviteViewProps = {
  userEmail: string;
};

export const TeamInviteView = ({ userEmail }: TeamInviteViewProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const flags = useFlags();

  const store = useOnboardingStore();
  const { setTeamInvites, teamDetails, setTeamId, teamId, resetOnboardingPreservingPlan } = store;
  const { isSubmitting } = useCreateTeam({ redirectBasePath: "/settings/teams/new" });
  const [isCSVModalOpen, setIsCSVModalOpen] = React.useState(false);

  // Read teamId from query params and store it (from payment callback)
  useEffect(() => {
    const teamIdParam = searchParams?.get("teamId");
    if (teamIdParam) {
      const parsedTeamId = parseInt(teamIdParam, 10);
      if (!isNaN(parsedTeamId)) {
        setTeamId(parsedTeamId);
      }
    }
  }, [searchParams, setTeamId]);

  const googleWorkspaceEnabled = flags["google-workspace-directory"];

  const handleGoogleWorkspaceConnect = () => {
    // TODO: Implement Google Workspace connection
    console.log("Connect Google Workspace");
  };

  const handleInviteViaEmail = () => {
    router.push(`/settings/teams/new/invite/email?teamId=${teamId}`);
  };

  const handleUploadCSV = () => {
    setIsCSVModalOpen(true);
  };

  const handleCopyInviteLink = () => {
    // Disabled for now as per requirements
    console.log("Copy invite link - disabled");
  };

  const handleSkip = async () => {
    posthog.capture("settings_team_invite_skip_clicked");
    setTeamInvites([]);
    resetOnboardingPreservingPlan();
    // Redirect to teams page after skipping
    router.push("/teams");
  };

  const handleBack = () => {
    posthog.capture("settings_team_invite_back_clicked");
    router.push("/settings/teams/new");
  };

  return (
    <>
      <OnboardingLayout userEmail={userEmail} currentStep={2} totalSteps={3}>
        {/* Left column - Main content */}
        <div className="flex w-full flex-col gap-4">
          <OnboardingCard
            title={t("invite")}
            subtitle={t("onboarding_invite_subtitle")}
            footer={
              <div className="flex w-full items-center justify-between gap-4">
                <Button
                  color="minimal"
                  className="rounded-[10px]"
                  onClick={handleBack}
                  disabled={isSubmitting}>
                  {t("back")}
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    color="minimal"
                    className="rounded-[10px]"
                    onClick={handleSkip}
                    disabled={isSubmitting}>
                    {t("onboarding_skip_for_now")}
                  </Button>
                </div>
              </div>
            }>
            <InviteOptions
              onInviteViaEmail={handleInviteViaEmail}
              onUploadCSV={handleUploadCSV}
              onCopyInviteLink={handleCopyInviteLink}
              onConnectGoogleWorkspace={googleWorkspaceEnabled ? handleGoogleWorkspaceConnect : undefined}
              isSubmitting={isSubmitting}
            />
          </OnboardingCard>
        </div>

        {/* Right column - Browser view */}
        <OnboardingInviteBrowserView teamName={teamDetails.name} />
      </OnboardingLayout>

      {/* CSV Upload Modal */}
      <CSVUploadModal isOpen={isCSVModalOpen} onClose={() => setIsCSVModalOpen(false)} />
    </>
  );
};
