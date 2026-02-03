"use client";

import { useRouter, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Label, TextField, TextArea } from "@calcom/ui/components/form";

import { OnboardingCard } from "../../components/OnboardingCard";
import { OnboardingLayout } from "../../components/OnboardingLayout";
import { OnboardingOrganizationBrowserView } from "../../components/onboarding-organization-browser-view";
import { useMigrationFlow } from "../../hooks/useMigrationFlow";
import { useOnboardingStore } from "../../store/onboarding-store";
import { ValidatedOrganizationSlug } from "./validated-organization-slug";

type OrganizationDetailsViewProps = {
  userEmail: string;
};

// Helper function to slugify organization name
const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces, underscores with single dash
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing dashes
};

export const OrganizationDetailsView = ({ userEmail }: OrganizationDetailsViewProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const { organizationDetails, setOrganizationDetails, selectedPlan, setSelectedPlan } = useOnboardingStore();
  const { isMigrationFlow, hasTeams } = useMigrationFlow();

  const [organizationName, setOrganizationName] = useState("");
  const [organizationLink, setOrganizationLink] = useState("");
  const [organizationBio, setOrganizationBio] = useState("");
  const [isSlugValid, setIsSlugValid] = useState(false);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  // Ensure selectedPlan is set to "organization" when entering organization onboarding
  useEffect(() => {
    if (selectedPlan !== "organization") {
      setSelectedPlan("organization");
    }
  }, [selectedPlan, setSelectedPlan]);

  // Load from store on mount
  useEffect(() => {
    setOrganizationName(organizationDetails.name);
    setOrganizationLink(organizationDetails.link);
    setOrganizationBio(organizationDetails.bio);
    // If there's a pre-existing link, consider it manually set
    if (organizationDetails.link) {
      setIsSlugManuallyEdited(true);
    }
  }, [organizationDetails]);

  // Auto-populate slug from organization name (unless manually edited)
  useEffect(() => {
    if (!isSlugManuallyEdited && organizationName) {
      const slugifiedName = slugify(organizationName);
      setOrganizationLink(slugifiedName);
    }
  }, [organizationName, isSlugManuallyEdited]);

  const handleSlugChange = (value: string) => {
    setOrganizationLink(value);
    setIsSlugManuallyEdited(true);
  };

  const handleContinue = () => {
    if (!isSlugValid) {
      return;
    }

    posthog.capture("onboarding_organization_details_continue_clicked", {
      has_bio: !!organizationBio,
    });

    // Save to store
    setOrganizationDetails({
      name: organizationName,
      link: organizationLink,
      bio: organizationBio,
    });
    const migrateParam = searchParams?.get("migrate");
    const nextUrl = `/onboarding/organization/brand${migrateParam ? `?migrate=${migrateParam}` : ""}`;
    router.push(nextUrl);
  };

  const totalSteps = isMigrationFlow && hasTeams ? 6 : 4;

  return (
    <OnboardingLayout userEmail={userEmail} currentStep={1} totalSteps={totalSteps}>
      {/* Left column - Main content */}
      <OnboardingCard
        title={t("onboarding_org_details_title")}
        subtitle={t("onboarding_org_details_subtitle")}
        footer={
          <div className="flex w-full items-center justify-between gap-4">
            <Button
              color="minimal"
              className="rounded-[10px]"
              onClick={() => {
                posthog.capture("onboarding_organization_details_back_clicked");
                router.push("/onboarding/getting-started");
              }}>
              {t("back")}
            </Button>
            <Button
              color="primary"
              className="rounded-[10px]"
              onClick={handleContinue}
              disabled={!isSlugValid || !organizationName || !organizationLink}>
              {t("continue")}
            </Button>
          </div>
        }>
        {/* Form */}
        <div className="relative flex">
          <div className="relative h-full w-full gap-6 py-2 pr-2">
            <div className="flex w-full flex-col gap-4 rounded-xl">
              {/* Organization Name */}
              <div className="flex w-full flex-col gap-1.5">
                <Label className="text-emphasis mb-0 text-sm font-medium leading-4">
                  {t("organization_name")}
                </Label>
                <TextField
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder={t("organization_name")}
                />
              </div>

              {/* Organization Link */}
              <ValidatedOrganizationSlug
                value={organizationLink}
                onChange={handleSlugChange}
                onValidationChange={setIsSlugValid}
              />

              {/* Organization Bio */}
              <div className="flex w-full flex-col gap-1.5">
                <Label className="text-emphasis mb-0 text-sm font-medium leading-4">
                  {t("onboarding_org_bio_label")}
                </Label>
                <TextArea
                  value={organizationBio}
                  onChange={(e) => setOrganizationBio(e.target.value)}
                  placeholder={t("onboarding_org_bio_placeholder")}
                  rows={4}
                  className="border-default max-h-[200px] rounded-lg border px-2 py-2 text-sm leading-tight"
                />
              </div>
            </div>
          </div>
        </div>
      </OnboardingCard>

      {/* Right column - Browser view */}
      <OnboardingOrganizationBrowserView
        avatar={null}
        name={organizationName}
        bio={organizationBio}
        slug={organizationLink}
        bannerUrl={null}
      />
    </OnboardingLayout>
  );
};
