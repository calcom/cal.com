"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { ColorPicker, Label } from "@calcom/ui/components/form";

import { OnboardingCard } from "../../components/OnboardingCard";
import { OnboardingLayout } from "../../components/OnboardingLayout";
import { OnboardingOrganizationBrowserView } from "../../components/onboarding-organization-browser-view";
import { useOnboardingStore } from "../../store/onboarding-store";

type OrganizationBrandViewProps = {
  userEmail: string;
};

export const OrganizationBrandView = ({ userEmail }: OrganizationBrandViewProps) => {
  const router = useRouter();
  const { t } = useLocale();
  const { organizationDetails, organizationBrand, setOrganizationBrand } = useOnboardingStore();

  const [_logoFile, setLogoFile] = useState<File | null>(null);
  const [_bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState("#000000");
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load from store on mount
  useEffect(() => {
    setLogoPreview(organizationBrand.logo);
    setBannerPreview(organizationBrand.banner);
    setBrandColor(organizationBrand.color);
  }, [organizationBrand]);

  const handleLogoChange = (file: File | null) => {
    setLogoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLogoPreview(base64);
        setOrganizationBrand({ logo: base64 });
      };
      reader.readAsDataURL(file);
    } else {
      setLogoPreview(null);
      setOrganizationBrand({ logo: null });
    }
  };

  const handleBannerChange = (file: File | null) => {
    setBannerFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setBannerPreview(base64);
        setOrganizationBrand({ banner: base64 });
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
  }, [logoPreview, bannerPreview, brandColor]);

  const handleContinue = () => {
    // Save to store (already saved on change, but ensure it's persisted)
    setOrganizationBrand({
      logo: logoPreview,
      banner: bannerPreview,
      color: brandColor,
    });
    router.push("/onboarding/organization/teams");
  };

  return (
    <OnboardingLayout userEmail={userEmail} currentStep={3}>
      {/* Left column - Main content */}
      <OnboardingCard
        title={t("onboarding_org_brand_title")}
        subtitle={t("onboarding_org_brand_subtitle")}
        footer={
          <div className="flex w-full items-center justify-between gap-4">
            <Button
              color="minimal"
              className="rounded-[10px]"
              onClick={() => router.push("/onboarding/organization/details")}>
              {t("back")}
            </Button>
            <Button color="primary" className="rounded-[10px]" onClick={handleContinue}>
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
              {/* Banner Upload */}
              <div className="flex w-full flex-col gap-2">
                <p className="text-emphasis text-sm font-medium leading-4">{t("onboarding_banner_label")}</p>
                <div className="flex w-full flex-col gap-2">
                  <div className="bg-muted border-muted relative h-[92px] w-full overflow-hidden rounded-md border">
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
                  <div className="bg-muted border-muted relative h-16 w-16 shrink-0 overflow-hidden rounded-md border">
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
      />
    </OnboardingLayout>
  );
};
