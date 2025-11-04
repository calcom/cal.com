"use client";

import * as Popover from "@radix-ui/react-popover";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HexColorPicker } from "react-colorful";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Logo } from "@calcom/ui/components/logo";

import { OnboardingBrowserView } from "../../components/onboarding-browser-view";
import { useOnboardingStore } from "../../store/onboarding-store";

type TeamBrandViewProps = {
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

export const TeamBrandView = ({ userEmail }: TeamBrandViewProps) => {
  const router = useRouter();
  const { t } = useLocale();
  const { teamBrand, setTeamBrand, teamDetails } = useOnboardingStore();

  const [brandColor, setBrandColor] = useState("#000000");
  const [_logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    setBrandColor(teamBrand.color);
    setLogoPreview(teamBrand.logo);
  }, [teamBrand]);

  const handleLogoChange = (file: File | null) => {
    setLogoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLogoPreview(base64);
        setTeamBrand({ logo: base64 });
      };
      reader.readAsDataURL(file);
    } else {
      setLogoPreview(null);
      setTeamBrand({ logo: null });
    }
  };

  const handleContinue = () => {
    setTeamBrand({ color: brandColor });
    router.push("/onboarding/teams/invite");
  };

  const handleSkip = () => {
    router.push("/onboarding/teams/invite");
  };

  return (
    <div className="bg-default flex min-h-screen w-full flex-col items-start overflow-clip rounded-xl">
      {/* Header */}
      <div className="flex w-full items-center justify-between px-6 py-4">
        <Logo className="h-5 w-auto" />

        {/* Progress dots - centered */}
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center gap-1">
          <div className="bg-emphasis h-1 w-1 rounded-full" />
          <div className="bg-emphasis h-1 w-1 rounded-full" />
          <div className="bg-emphasis h-1.5 w-1.5 rounded-full" />
          <div className="bg-subtle h-1 w-1 rounded-full" />
        </div>

        <div className="bg-muted flex items-center gap-2 rounded-full px-3 py-2">
          <p className="text-emphasis text-sm font-medium leading-none">{userEmail}</p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex h-full w-full items-start justify-center px-6 py-8">
        <div className="grid w-full max-w-[1200px] grid-cols-1 gap-6 lg:grid-cols-[1fr_auto]">
          {/* Left column - Main content */}
          <div className="relative flex w-full flex-col gap-6">
            {/* Card */}
            <div className="bg-muted border-muted relative rounded-xl border p-1">
              <div className="rounded-inherit flex w-full flex-col items-start overflow-clip">
                {/* Card Header */}
                <div className="flex w-full gap-1.5 px-5 py-4">
                  <div className="flex w-full flex-col gap-1">
                    <h1 className="font-cal text-xl font-semibold leading-6">{t("customize_team_brand")}</h1>
                    <p className="text-subtle text-sm font-medium leading-tight">
                      {t("team_brand_subtitle")}
                    </p>
                  </div>
                </div>

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
                                  setTeamBrand({ color: value });
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
                            <p className="text-subtle text-xs font-normal leading-3">
                              {t("onboarding_logo_size_hint")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex w-full items-center justify-end gap-1 px-5 py-4">
                  <Button color="minimal" className="rounded-[10px]" onClick={handleSkip}>
                    {t("ill_do_this_later")}
                  </Button>
                  <Button color="primary" className="rounded-[10px]" onClick={handleContinue}>
                    {t("continue")}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right column - Browser view */}
          <OnboardingBrowserView />
        </div>
      </div>
    </div>
  );
};
