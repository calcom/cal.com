"use client";

import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

import { useFlags } from "@calcom/features/flags/hooks";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";

import { InviteOptions } from "../../components/InviteOptions";
import { OnboardingCard } from "../../components/OnboardingCard";
import { OnboardingLayout } from "../../components/OnboardingLayout";
import { OnboardingInviteBrowserView } from "../../components/onboarding-invite-browser-view";
import { useOnboardingStore } from "../../store/onboarding-store";
import { CSVUploadModal } from "./csv-upload-modal";

type TeamInviteViewProps = {
  userEmail: string;
  teamId?: number | null;
};

export const TeamInviteView = ({ userEmail, teamId }: TeamInviteViewProps) => {
  const router = useRouter();
  const { t } = useLocale();
  const flags = useFlags();

  const store = useOnboardingStore();
  const { setTeamInvites, teamDetails, setTeamId, teamId: storedTeamId } = store;
  const [isCSVModalOpen, setIsCSVModalOpen] = React.useState(false);

  // Store teamId from URL if provided and not already stored
  useEffect(() => {
    if (teamId && !storedTeamId) {
      setTeamId(teamId);
    }
  }, [teamId, storedTeamId, setTeamId]);

  // Redirect to details page if team doesn't exist
  useEffect(() => {
    if (!storedTeamId && !teamId) {
      router.push("/onboarding/teams/details");
    }
  }, [storedTeamId, teamId, router]);

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

  const handleSkip = () => {
    setTeamInvites([]);
    // Navigate to next step (team already exists)
    const gettingStartedPath = flags["onboarding-v3"]
      ? "/onboarding/personal/settings"
      : "/getting-started";
    router.push(gettingStartedPath);
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
                  onClick={() => router.push("/onboarding/teams/details")}>
                  {t("back")}
                </Button>
                <div className="flex items-center gap-2">
                  <Button color="minimal" className="rounded-[10px]" onClick={handleSkip}>
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
              isSubmitting={false}
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
