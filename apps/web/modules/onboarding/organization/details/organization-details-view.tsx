"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Label, TextField, TextArea } from "@calcom/ui/components/form";
import { Logo } from "@calcom/ui/components/logo";

import { OnboardingContinuationPrompt } from "../../components/onboarding-continuation-prompt";
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

    // Save to store
    setOrganizationDetails({
      name: organizationName,
      link: organizationLink,
      bio: organizationBio,
    });
    router.push("/onboarding/organization/brand");
  };

  return (
    <div className="bg-default flex min-h-screen w-full flex-col items-start overflow-clip rounded-xl">
      {/* Header */}
      <div className="flex w-full items-center justify-between px-6 py-4">
        <Logo className="h-5 w-auto" />

        {/* Progress dots - centered */}
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center gap-1">
          <div className="bg-emphasis h-1 w-1 rounded-full" />
          <div className="bg-emphasis h-1.5 w-1.5 rounded-full" />
          <div className="bg-subtle h-1 w-1 rounded-full" />
          <div className="bg-subtle h-1 w-1 rounded-full" />
        </div>

        <div className="bg-muted flex items-center gap-2 rounded-full px-3 py-2">
          <p className="text-emphasis text-sm font-medium leading-none">{userEmail}</p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex h-full w-full items-start justify-center px-6 py-8">
        <div className="flex w-full max-w-[600px] flex-col gap-6">
          {/* Card */}
          <div className="bg-muted border-muted relative rounded-xl border p-1">
            <div className="rounded-inherit flex w-full flex-col items-start overflow-clip">
              {/* Card Header */}
              <div className="flex w-full gap-1.5 px-5 py-4">
                <div className="flex w-full flex-col gap-1">
                  <h1 className="font-cal text-xl font-semibold leading-6">
                    {t("onboarding_org_details_title")}
                  </h1>
                  <p className="text-subtle text-sm font-medium leading-tight">
                    {t("onboarding_org_details_subtitle")}
                  </p>
                </div>
              </div>

              {/* Form */}
              <div className="bg-default border-muted w-full rounded-[10px] border">
                <div className="rounded-inherit flex w-full flex-col items-start overflow-clip">
                  <div className="flex w-full flex-col items-start">
                    <div className="flex w-full gap-6 px-5 py-5">
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
                            className="border-default h-7 rounded-[10px] border px-2 py-1.5 text-sm"
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
                </div>
              </div>

              {/* Footer */}
              <div className="flex w-full items-center justify-end gap-1 px-5 py-4">
                <Button
                  color="primary"
                  className="rounded-[10px]"
                  onClick={handleContinue}
                  disabled={!isSlugValid || !organizationName || !organizationLink}>
                  {t("continue")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
