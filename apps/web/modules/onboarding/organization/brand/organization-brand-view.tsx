"use client";

import { useRouter, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { ColorPicker, Label } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import { OnboardingCard } from "../../components/OnboardingCard";
import { OnboardingLayout } from "../../components/OnboardingLayout";
import { OnboardingOrganizationBrowserView } from "../../components/onboarding-organization-browser-view";
import { useMigrationFlow } from "../../hooks/useMigrationFlow";
import { useOnboardingStore } from "../../store/onboarding-store";

type OrganizationBrandViewProps = {
  userEmail: string;
};

export const OrganizationBrandView = ({ userEmail }: OrganizationBrandViewProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const { organizationDetails, organizationBrand, setOrganizationBrand } = useOnboardingStore();
  const { isMigrationFlow, hasTeams } = useMigrationFlow();

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState("#000000");
  const [isResizingLogo, setIsResizingLogo] = useState(false);
  const [isResizingBanner, setIsResizingBanner] = useState(false);

  const resizeImageMutation = trpc.viewer.organizations.resizeOnboardingImage.useMutation();

  // Load from store on mount
  useEffect(() => {
    setLogoPreview(organizationBrand.logo);
    setBannerPreview(organizationBrand.banner);
    setBrandColor(organizationBrand.color);
  }, [organizationBrand]);

  const handleLogoChange = async (file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setIsResizingLogo(true);
        try {
          const result = await resizeImageMutation.mutateAsync({
            image: base64,
            isBanner: false,
          });
          setLogoPreview(result.resizedImage);
          setOrganizationBrand({ logo: result.resizedImage });
        } catch (error) {
          showToast(t("error_uploading_logo"), "error");
          console.error("Error resizing logo:", error);
        } finally {
          setIsResizingLogo(false);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setLogoPreview(null);
      setOrganizationBrand({ logo: null });
    }
  };

  const handleBannerChange = async (file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setIsResizingBanner(true);
        try {
          const result = await resizeImageMutation.mutateAsync({
            image: base64,
            isBanner: true,
          });
          setBannerPreview(result.resizedImage);
          setOrganizationBrand({ banner: result.resizedImage });
        } catch (error) {
          showToast(t("error_uploading_banner"), "error");
          console.error("Error resizing banner:", error);
        } finally {
          setIsResizingBanner(false);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setBannerPreview(null);
      setOrganizationBrand({ banner: null });
    }
  };

  const handleColorChange = (color: string) => {
    setBrandColor(color);
    setOrganizationBrand({ color });
  };

  const getNextStep = () => {
    const migrateParam = searchParams?.get("migrate");
    const queryString = migrateParam ? `?migrate=${migrateParam}` : "";

    // If migration flow and has teams, go to migrate-teams, otherwise go to teams
    if (isMigrationFlow && hasTeams) {
      return `/onboarding/organization/migrate-teams${queryString}`;
    }
    return `/onboarding/organization/teams${queryString}`;
  };

  const handleContinue = () => {
    posthog.capture("onboarding_organization_brand_continue_clicked", {
      has_logo: !!logoPreview,
      has_banner: !!bannerPreview,
      has_custom_color: brandColor !== "#000000",
    });
    // Save to store (already saved on change, but ensure it's persisted)
    setOrganizationBrand({
      logo: logoPreview,
      banner: bannerPreview,
      color: brandColor,
    });
    router.push(getNextStep());
  };

  const handleSkip = () => {
    posthog.capture("onboarding_organization_brand_skip_clicked");
    // Skip brand customization and go to teams
    router.push("/onboarding/organization/teams");
  };

  const totalSteps = isMigrationFlow && hasTeams ? 6 : 4;

  return (
    <OnboardingLayout userEmail={userEmail} currentStep={2} totalSteps={totalSteps}>
      {/* Left column - Main content */}
      <OnboardingCard
        title={t("onboarding_org_brand_title")}
        subtitle={t("onboarding_org_brand_subtitle")}
        footer={
          <div className="flex w-full items-center justify-between gap-4">
            <Button
              color="minimal"
              className="rounded-[10px]"
              onClick={() => {
                posthog.capture("onboarding_organization_brand_back_clicked");
                router.push("/onboarding/organization/details");
              }}>
              {t("back")}
            </Button>
            <div className="flex items-center gap-2">
              <Button color="minimal" className="rounded-[10px]" onClick={handleSkip}>
                {t("onboarding_skip_for_now")}
              </Button>
              <Button color="primary" className="rounded-[10px]" onClick={handleContinue}>
                {t("continue")}
              </Button>
            </div>
          </div>
        }>
        {/* Form */}
        <div className="relative flex">
          {/* Scrollable content container */}
          <div className="relative h-full w-full gap-6">
            <div className="flex w-full flex-col gap-4 rounded-xl">
              {/* Banner Upload */}
              <div className="flex w-full flex-col gap-2">
                <p className="text-emphasis text-sm font-medium leading-4">{t("onboarding_banner_label")}</p>
                <div className="flex w-full flex-col gap-2">
                  <div className="bg-cal-muted border-muted relative h-[92px] w-full overflow-hidden rounded-md border">
                    {bannerPreview && (
                      <img
                        src={bannerPreview}
                        alt={t("onboarding_banner_preview_alt")}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      color="secondary"
                      size="sm"
                      className="w-fit"
                      loading={isResizingBanner}
                      onClick={() => document.getElementById("banner-upload")?.click()}>
                      {t("upload")}
                    </Button>
                    <input
                      id="banner-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleBannerChange(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>
                <p className="text-subtle text-xs font-normal leading-3">
                  {t("onboarding_banner_size_hint")}
                </p>
              </div>
              {/* Logo Upload */}
              <div className="flex w-full flex-col gap-2">
                <p className="text-emphasis text-sm font-medium leading-4">{t("logo")}</p>
                <div className="flex items-center gap-2">
                  <div className="bg-cal-muted border-muted relative h-16 w-16 shrink-0 overflow-hidden rounded-md border">
                    {logoPreview && (
                      <img
                        src={logoPreview}
                        alt={t("onboarding_logo_preview_alt")}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      color="secondary"
                      size="sm"
                      loading={isResizingLogo}
                      onClick={() => document.getElementById("logo-upload")?.click()}>
                      {t("upload")}
                    </Button>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleLogoChange(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>
                <p className="text-subtle text-xs font-normal leading-3">{t("onboarding_logo_size_hint")}</p>
              </div>
              {/* Brand Color */}
              <div className="flex w-full flex-col gap-2">
                <Label className="text-emphasis text-sm font-medium leading-4">
                  {t("light_brand_color")}
                </Label>
                <ColorPicker defaultValue={brandColor} onChange={handleColorChange} />
              </div>
            </div>
          </div>
        </div>
      </OnboardingCard>

      {/* Right column - Browser view */}
      <OnboardingOrganizationBrowserView
        avatar={logoPreview}
        name={organizationDetails.name}
        bio={organizationDetails.bio}
        slug={organizationDetails.link}
        bannerUrl={bannerPreview}
        brandColor={brandColor}
      />
    </OnboardingLayout>
  );
};
