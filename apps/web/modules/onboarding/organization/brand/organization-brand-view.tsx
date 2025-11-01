"use client";

import * as Popover from "@radix-ui/react-popover";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HexColorPicker } from "react-colorful";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";

import { OnboardingCard } from "../../personal/_components/OnboardingCard";
import { OnboardingLayout } from "../../personal/_components/OnboardingLayout";
import { useOnboardingStore } from "../../store/onboarding-store";

type OrganizationBrandViewProps = {
  userEmail: string;
};

const BrandColorPicker = ({
  value,
  onChange,
  t,
}: {
  value: string;
  onChange: (value: string) => void;
  t: (key: string) => string;
}) => {
  return (
    <div className="border-default bg-default flex h-7 w-32 items-center gap-2 rounded-lg border px-2 py-1.5">
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            className="h-4 w-4 shrink-0 rounded-full border border-gray-200"
            style={{ backgroundColor: value }}
            aria-label={t("onboarding_pick_color_aria")}
          />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content align="start" sideOffset={5}>
            <HexColorPicker color={value} onChange={onChange} className="!h-32 !w-32" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <input
        type="text"
        value={value.replace("#", "")}
        onChange={(e) => {
          const newValue = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
          onChange(newValue);
        }}
        className="text-emphasis grow border-none bg-transparent text-sm font-medium leading-4 outline-none"
        maxLength={6}
      />
    </div>
  );
};

export const OrganizationBrandView = ({ userEmail }: OrganizationBrandViewProps) => {
  const router = useRouter();
  const { t } = useLocale();
  const { organizationBrand, setOrganizationBrand, organizationDetails } = useOnboardingStore();

  const [brandColor, setBrandColor] = useState("#000000");
  const [_logoFile, setLogoFile] = useState<File | null>(null);
  const [_bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  // Load from store on mount
  useEffect(() => {
    setBrandColor(organizationBrand.color);
    setLogoPreview(organizationBrand.logo);
    setBannerPreview(organizationBrand.banner);
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

  const handleContinue = () => {
    // Save brand color to store
    setOrganizationBrand({ color: brandColor });
    router.push("/onboarding/organization/teams");
  };

  const handleSkip = () => {
    // Skip brand setup and go to teams
    router.push("/onboarding/organization/teams");
  };

  return (
    <OnboardingLayout userEmail={userEmail} currentStep={2}>
      <OnboardingCard
        title={t("onboarding_org_brand_title")}
        subtitle={t("onboarding_org_brand_subtitle")}
        footer={
          <>
            <Button color="minimal" className="rounded-[10px]" onClick={handleSkip}>
              {t("ill_do_this_later")}
            </Button>
            <Button color="primary" className="rounded-[10px]" onClick={handleContinue}>
              {t("continue")}
            </Button>
          </>
        }>
        {/* Form */}
        <div className="bg-default border-muted w-full rounded-[10px] border">
          <div className="rounded-inherit flex w-full flex-col items-start overflow-clip">
            <div className="flex w-full flex-col items-start">
              <div className="flex w-full gap-6 px-5 py-4">
                {/* Left side - Form */}
                <div className="flex w-full flex-col gap-6">
                  {/* Brand Color */}
                  <div className="flex w-full flex-col gap-6">
                    <p className="text-emphasis text-sm font-medium leading-4">{t("brand_color")}</p>
                    <div className="flex w-full items-center gap-2">
                      <p className="text-subtle w-[98px] overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium leading-4">
                        {t("onboarding_primary_color_label")}
                      </p>
                      <BrandColorPicker
                        value={brandColor}
                        onChange={(value) => {
                          setBrandColor(value);
                          setOrganizationBrand({ color: value });
                        }}
                        t={t}
                      />
                    </div>
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

                  {/* Banner Upload */}
                  <div className="flex w-full flex-col gap-2">
                    <p className="text-emphasis text-sm font-medium leading-4">
                      {t("onboarding_banner_label")}
                    </p>
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
                </div>

                {/* Right side - Preview */}
                <div className="bg-muted border-muted flex hidden h-[328px] w-full grow overflow-hidden rounded-[10px] border p-5 md:block">
                  <div className="flex flex-col gap-2.5">
                    <p className="text-subtle text-sm font-medium leading-4">{t("preview")}</p>
                    <div className="border-subtle bg-default relative flex w-[110%] flex-col gap-2.5 rounded-md border px-5 pb-5 pt-[74px]">
                      {/* Banner preview */}
                      <div className="bg-muted border-muted absolute left-1 top-1 h-[92px] w-[272px] overflow-hidden rounded-[4px] border">
                        {bannerPreview && (
                          <img
                            src={bannerPreview}
                            alt={t("onboarding_banner_preview_alt")}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-3 p-1">
                          <div className="flex flex-col gap-3">
                            {/* Logo preview */}
                            <div className="bg-muted z-20 h-9 w-9 shrink-0 overflow-hidden rounded-md border-2 border-[var(--cal-bg)]">
                              {logoPreview && (
                                <img
                                  src={logoPreview}
                                  alt={t("onboarding_logo_preview_alt")}
                                  className="h-full w-full object-cover"
                                />
                              )}
                            </div>
                            <p className="text-subtle text-sm font-medium capitalize leading-4 ">
                              {organizationDetails.name || t("onboarding_preview_nameless")}
                            </p>
                          </div>
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-3">
                              <p className="font-cal text-xl leading-5 tracking-[0.2px]">
                                {t("onboarding_preview_example_title")}
                              </p>
                              <p className="text-subtle text-sm font-medium leading-5">
                                {t("onboarding_preview_example_description")}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          {[134, 104, 84, 104].map((width, i) => (
                            <div key={i} className="flex items-center gap-2 p-1">
                              <div className="bg-subtle h-5 w-5 shrink-0 rounded-full" />
                              <div className="bg-subtle h-2.5 rounded-full" style={{ width: `${width}px` }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </OnboardingCard>
    </OnboardingLayout>
  );
};
