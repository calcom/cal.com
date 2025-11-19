"use client";

import { useRouter } from "next/navigation";
import React from "react";

import { useFlags } from "@calcom/features/flags/hooks";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";

import { InviteOptions } from "../../components/InviteOptions";
import { OnboardingCard } from "../../components/OnboardingCard";
import { OnboardingLayout } from "../../components/OnboardingLayout";
import { OnboardingInviteBrowserView } from "../../components/onboarding-invite-browser-view";
import { useCreateTeam } from "../../hooks/useCreateTeam";
import { useOnboardingStore } from "../../store/onboarding-store";
import { CSVUploadModal } from "./csv-upload-modal";

type TeamInviteViewProps = {
  userEmail: string;
};

export const TeamInviteView = ({ userEmail }: TeamInviteViewProps) => {
  const router = useRouter();
  const { t } = useLocale();
  const flags = useFlags();

  const store = useOnboardingStore();
  const { setTeamInvites, teamDetails } = store;
  const { createTeam, isSubmitting } = useCreateTeam();
  const [isCSVModalOpen, setIsCSVModalOpen] = React.useState(false);

  const googleWorkspaceEnabled = flags["google-workspace-directory"];

  const handleGoogleWorkspaceConnect = () => {
    // TODO: Implement Google Workspace connection
    console.log("Connect Google Workspace");
  };

  const handleInviteViaEmail = () => {
    router.push("/onboarding/teams/invite/email");
  };

  const handleUploadCSV = () => {
    setIsCSVModalOpen(true);
  };

  const handleCopyInviteLink = () => {
    // Disabled for now as per requirements
    console.log("Copy invite link - disabled");
  };

  const handleSkip = async () => {
    setTeamInvites([]);
    // Create the team without invites (will handle checkout redirect if needed)
    await createTeam(store);
  };

  const handleInvite = async () => {
    // For now, just proceed to create the team
    // The actual invites will be handled in the email page
    await createTeam(store);
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
                  onClick={() => router.push("/onboarding/teams/details")}
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
                  <Button
                    color="primary"
                    className="rounded-[10px]"
                    onClick={handleInvite}
                    disabled={isSubmitting}
                    loading={isSubmitting}>
                    {t("invite")}
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
