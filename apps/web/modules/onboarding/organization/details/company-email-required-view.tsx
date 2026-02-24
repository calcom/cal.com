"use client";

import { useRouter } from "next/navigation";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";

import { OnboardingCard } from "../../components/OnboardingCard";
import { OnboardingLayout } from "../../components/OnboardingLayout";
import { OnboardingOrganizationBrowserView } from "../../components/onboarding-organization-browser-view";

export const CompanyEmailRequired = ({ userEmail }: { userEmail: string }) => {
  const { t } = useLocale();
  const router = useRouter();

  return (
    <OnboardingLayout userEmail={userEmail}>
      <OnboardingCard
        title={t("set_up_your_organization")}
        subtitle={t("onboarding_org_details_subtitle")}
        footer={
          <div className="flex w-full items-center justify-between gap-4">
            <Button color="minimal" className="rounded-[10px]" onClick={() => router.back()}>
              {t("go_back")}
            </Button>
            <Button color="primary" className="rounded-[10px]" href="/settings/my-account/profile?add-email=true">
              {t("add_company_email")}
            </Button>
          </div>
        }>
        <Alert severity="warning" title={t("org_requires_company_email")} />
      </OnboardingCard>

      <OnboardingOrganizationBrowserView avatar={null} name="" bio="" slug="" bannerUrl={null} />
    </OnboardingLayout>
  );
};
