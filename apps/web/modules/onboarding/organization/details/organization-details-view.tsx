"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Label, TextField, TextArea } from "@calcom/ui/components/form";

import { OnboardingCard } from "../../components/OnboardingCard";
import { OnboardingLayout } from "../../components/OnboardingLayout";
import { OnboardingOrganizationBrowserView } from "../../components/onboarding-organization-browser-view";
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
  const { t } = useLocale();
  const { organizationDetails, setOrganizationDetails } = useOnboardingStore();

  const [organizationName, setOrganizationName] = useState("");
  const [organizationLink, setOrganizationLink] = useState("");
  const [organizationBio, setOrganizationBio] = useState("");
  const [isSlugValid, setIsSlugValid] = useState(false);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  const checkScrollPosition = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtTop = scrollTop <= 1; // Small threshold for rounding
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

    setShowTopFade(!isAtTop && scrollHeight > clientHeight);
    setShowBottomFade(!isAtBottom && scrollHeight > clientHeight);
  };

  // Check scroll position on mount and when content changes
  useEffect(() => {
    checkScrollPosition();
    // Add resize observer to handle dynamic content changes
    const resizeObserver = new ResizeObserver(checkScrollPosition);
    if (scrollContainerRef.current) {
      resizeObserver.observe(scrollContainerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, [organizationName, organizationLink, organizationBio]);

  const handleContinue = () => {
    if (!isSlugValid) {
      return;
    }

    // Save to store
    setOrganizationDetails({
      name: organizationName,
      link: organizationLink,
      bio: organizationBio,
    });
    router.push("/onboarding/organization/brand");
  };

  return (
    <OnboardingLayout userEmail={userEmail} currentStep={2}>
      {/* Left column - Main content */}
      <OnboardingCard
        title={t("onboarding_org_details_title")}
        subtitle={t("onboarding_org_details_subtitle")}
        footer={
          <div className="flex w-full items-center justify-end gap-4">
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
        <div className="scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent scrollbar-thin relative flex">
          {/* Scrollable content container */}
          <div
            ref={scrollContainerRef}
            onScroll={checkScrollPosition}
            className="relative h-full w-full gap-6 overflow-y-scroll px-2 py-2">
            {/* Top fade overlay */}
            {showTopFade && (
              <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-12 bg-gradient-to-b from-white to-transparent" />
            )}
            {/* Bottom fade overlay */}
            {showBottomFade && (
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-12 bg-gradient-to-t from-white to-transparent" />
            )}
            <div className="flex w-full flex-col gap-4 rounded-xl">
              {/* Organization Name */}
              <div className="flex w-full flex-col gap-1.5">
                <Label className="text-emphasis text-sm font-medium leading-4">
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
                <Label className="text-emphasis text-sm font-medium leading-4">
                  {t("onboarding_org_bio_label")}
                </Label>
                <TextArea
                  value={organizationBio}
                  onChange={(e) => setOrganizationBio(e.target.value)}
                  placeholder={t("onboarding_org_bio_placeholder")}
                  rows={4}
                  className="border-default rounded-lg border px-2 py-2 text-sm leading-tight"
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
