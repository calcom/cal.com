"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { useOnboarding } from "@calcom/web/modules/ee/organizations/lib/onboardingStore";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { OrganizationWizardLayout } from "./_components/OrganizationWizardLayout";

export const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  return <OrganizationWizardLayout currentStep={1}>{children}</OrganizationWizardLayout>;
};

const ResumeOnboardingView = () => {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const onboardingIdParam = searchParams?.get("onboardingId");

  const { dbOnboarding, isLoadingOrgOnboarding, useOnboardingStore } = useOnboarding();
  const { reset } = useOnboardingStore();

  useEffect(() => {
    if (isLoadingOrgOnboarding) {
      return;
    }

    if (!onboardingIdParam) {
      router.push("/settings/organizations/new");
      return;
    }

    if (!dbOnboarding) {
      return;
    }

    if (dbOnboarding.isComplete) {
      router.push("/settings/organizations");
      return;
    }

    // Load onboarding data into store
    reset({
      onboardingId: dbOnboarding.id,
      name: dbOnboarding.name,
      slug: dbOnboarding.slug,
      orgOwnerEmail: dbOnboarding.orgOwnerEmail,
      billingPeriod: dbOnboarding.billingPeriod,
      seats: dbOnboarding.seats,
      pricePerSeat: dbOnboarding.pricePerSeat,
      logo: dbOnboarding.logo,
      bio: dbOnboarding.bio,
      brandColor: dbOnboarding.brandColor,
      bannerUrl: dbOnboarding.bannerUrl,
    });

    // Redirect to next step (About page)
    router.push("/settings/organizations/new/about");
  }, [dbOnboarding, isLoadingOrgOnboarding, onboardingIdParam, reset, router]);

  if (isLoadingOrgOnboarding) {
    return (
      <SkeletonContainer className="stack-y-4">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-4 w-3/4" />
        <SkeletonText className="h-4 w-1/2" />
      </SkeletonContainer>
    );
  }

  if (!onboardingIdParam) {
    return (
      <Alert
        data-testid="error"
        severity="error"
        title={t("error")}
        message={t("no_onboarding_id_provided")}
      />
    );
  }

  if (!dbOnboarding) {
    return (
      <Alert data-testid="error" severity="error" title={t("error")} message={t("onboarding_not_found")} />
    );
  }

  if (dbOnboarding.isComplete) {
    return (
      <Alert
        data-testid="error"
        severity="info"
        title={t("onboarding_already_complete")}
        message={t("onboarding_already_complete_description")}
      />
    );
  }

  // Loading state while redirecting
  return (
    <SkeletonContainer className="stack-y-4">
      <SkeletonText className="h-8 w-full" />
      <SkeletonText className="h-4 w-3/4" />
    </SkeletonContainer>
  );
};

export default ResumeOnboardingView;
