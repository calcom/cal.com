"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useRef } from "react";

import { useFlags } from "@calcom/features/flags/hooks";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";

import { InviteOptions } from "../../components/InviteOptions";
import { OnboardingCard } from "../../components/OnboardingCard";
import { OnboardingLayout } from "../../components/OnboardingLayout";
import { OnboardingOrganizationBrowserView } from "../../components/onboarding-organization-browser-view";
import { useSubmitOnboarding } from "../../hooks/useSubmitOnboarding";
import { trackStepBack, trackStepSkipped, trackStepViewed } from "../../lib/posthog-tracking";
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
  const hasTrackedPageView = useRef(false);

  // Track step viewed on mount
  useEffect(() => {
    if (!hasTrackedPageView.current) {
      hasTrackedPageView.current = true;
      trackStepViewed({ step: "organization_invite", flow: "organization" });
    }
  }, []);

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
    trackStepSkipped({ step: "organization_invite", flow: "organization", skipped_action: "member_invites" });
    setInvites([]);
    await submitOnboarding(store, userEmail, []);
  };

  const handleInvite = async () => {
    await submitOnboarding(store, userEmail, []);
  };

  const handleBack = () => {
    trackStepBack({ step: "organization_invite", flow: "organization" });
    router.push("/onboarding/organization/teams");
  };

  return (
    <OnboardingLayout userEmail={userEmail} currentStep={4} totalSteps={4}>
      <div className="flex h-full w-full flex-col gap-4">
        <OnboardingCard
          title={t("onboarding_org_invite_title")}
          subtitle={t("onboarding_org_invite_subtitle_full")}
          footer={
            <div className="flex w-full items-center justify-between gap-4">
              <Button color="minimal" className="rounded-[10px]" onClick={handleBack} disabled={isSubmitting}>
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
