"use client";

import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import React from "react";

import { useFlags } from "@calcom/web/modules/feature-flags/hooks/useFlags";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";

import { InviteOptions } from "../../components/InviteOptions";
import { OnboardingCard } from "../../components/OnboardingCard";
import { OnboardingLayout } from "../../components/OnboardingLayout";
import { OnboardingOrganizationBrowserView } from "../../components/onboarding-organization-browser-view";
import { useSubmitOnboarding } from "../../hooks/useSubmitOnboarding";
import { useOnboardingStore } from "../../store/onboarding-store";
import { OrganizationCSVUploadModal } from "./csv-upload-modal";

type OrganizationInviteViewProps = {
  userEmail: string;
};

export const OrganizationInviteView = ({ userEmail }: OrganizationInviteViewProps) => {
  const router = useRouter();
  const { t } = useLocale();
  const flags = useFlags();

  const store = useOnboardingStore();
  const { setInvites, organizationDetails, organizationBrand } = store;
  const { submitOnboarding, isSubmitting } = useSubmitOnboarding();
  const [isCSVModalOpen, setIsCSVModalOpen] = React.useState(false);

  const googleWorkspaceEnabled = flags["google-workspace-directory"];

  const handleGoogleWorkspaceConnect = () => {
    console.log("Connect Google Workspace");
  };

  const handleInviteViaEmail = () => {
    router.push("/onboarding/organization/invite/email");
  };

  const handleUploadCSV = () => {
    setIsCSVModalOpen(true);
  };

  const handleCopyInviteLink = () => {
    console.log("Copy invite link - disabled");
  };

  const handleSkip = async () => {
    posthog.capture("onboarding_organization_invite_skip_clicked");
    setInvites([]);
    await submitOnboarding(store, userEmail, []);
  };

  const handleInvite = async () => {
    await submitOnboarding(store, userEmail, []);
  };

  return (
    <OnboardingLayout userEmail={userEmail} currentStep={4} totalSteps={4}>
      <div className="flex h-full w-full flex-col gap-4">
        <OnboardingCard
          title={t("onboarding_org_invite_title")}
          subtitle={t("onboarding_org_invite_subtitle_full")}
          footer={
            <div className="flex w-full items-center justify-between gap-4">
              <Button
                color="minimal"
                className="rounded-[10px]"
                onClick={() => {
                  posthog.capture("onboarding_organization_invite_back_clicked");
                  router.push("/onboarding/organization/teams");
                }}
                disabled={isSubmitting}>
                {t("back")}
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  color="minimal"
                  className="rounded-[10px]"
                  onClick={handleSkip}
                  disabled={isSubmitting}>
                  {t("ill_do_this_later")}
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

      <OnboardingOrganizationBrowserView
        avatar={organizationBrand.logo}
        name={organizationDetails.name}
        bio={organizationDetails.bio}
        slug={organizationDetails.link}
        bannerUrl={organizationBrand.banner}
      />
      <OrganizationCSVUploadModal isOpen={isCSVModalOpen} onClose={() => setIsCSVModalOpen(false)} />
    </OnboardingLayout>
  );
};
