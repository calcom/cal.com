"use client";

import { Button } from "@calid/features/ui/components/button";
import ThemeCard from "@calid/features/ui/components/card/theme-card";
import { Form } from "@calid/features/ui/components/form";
import { Input } from "@calid/features/ui/components/input/input";
import { SettingsSwitch } from "@calid/features/ui/components/switch/settings-switch";
import { triggerToast } from "@calid/features/ui/components/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { APP_NAME, DEFAULT_LIGHT_BRAND_COLOR, DEFAULT_DARK_BRAND_COLOR } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { revalidateCalIdTeamDataCache } from "@calcom/web/app/(booking-page-wrapper)/team/[slug]/[type]/actions";

import SkeletonLoader from "../components/SkeletonLoader";
import { checkIfMemberAdminorOwner } from "../lib/checkIfMemberAdminorOwner";

const themeFormSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
});

const brandColorsFormSchema = z.object({
  brandColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color format"),
  darkBrandColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color format"),
});

type TeamThemeSetting = {
  theme: "light" | "dark" | "system";
};

type TeamBrandColorsSetting = {
  brandColor: string;
  darkBrandColor: string;
};

interface TeamAppearanceViewProps {
  teamId: number;
}

export default function TeamAppearanceView({ teamId }: TeamAppearanceViewProps) {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();

  // Fetch team data
  const {
    data: team,
    isLoading,
    error,
  } = trpc.viewer.calidTeams.get.useQuery({ teamId }, { enabled: !!teamId });

  const [hideBrandingValue, setHideBrandingValue] = useState(team?.hideTeamBranding ?? false);
  const [hideBookATeamMember, setHideBookATeamMember] = useState(team?.hideBookATeamMember ?? false);
  const [hideTeamProfileLink, setHideTeamProfileLink] = useState(team?.hideTeamProfileLink ?? false);

  const themeForm = useForm<TeamThemeSetting>({
    resolver: zodResolver(themeFormSchema),
    defaultValues: {
      theme: (team?.theme as "light" | "dark" | "system") || "system",
    },
  });

  const brandColorsForm = useForm<TeamBrandColorsSetting>({
    resolver: zodResolver(brandColorsFormSchema),
    defaultValues: {
      brandColor: team?.brandColor || DEFAULT_LIGHT_BRAND_COLOR,
      darkBrandColor: team?.darkBrandColor || DEFAULT_DARK_BRAND_COLOR,
    },
  });

  const {
    formState: { isSubmitting: isThemeSubmitting, isDirty: isThemeDirty },
    reset: resetTheme,
  } = themeForm;

  const {
    formState: { isSubmitting: isBrandColorsSubmitting, isDirty: isBrandColorsDirty },
    reset: resetBrandColors,
  } = brandColorsForm;

  const mutation = trpc.viewer.calidTeams.update.useMutation();

  // Shared update handler
  const updateTeamSetting = async (payload: Record<string, any>, afterUpdate?: (team: any) => void) => {
    try {
      const updatedTeam = await mutation.mutateAsync({ id: teamId, ...payload });
      triggerToast(t("team_settings_updated_successfully"), "success");
      await utils.viewer.teams.get.invalidate();
      if (updatedTeam?.slug) {
        await revalidateCalIdTeamDataCache({
          teamSlug: updatedTeam.slug,
        });
      }
      if (afterUpdate) afterUpdate(updatedTeam);
    } catch (error: any) {
      triggerToast(error.message, "error");
    }
  };

  const onThemeFormSubmit = async ({ theme }: TeamThemeSetting) => {
    await updateTeamSetting({ theme: theme === "system" ? null : theme }, (updatedTeam) => {
      resetTheme({
        theme: (updatedTeam?.theme as "light" | "dark" | null) ?? "system",
      });
    });
  };

  const onBrandColorsFormSubmit = async (values: TeamBrandColorsSetting) => {
    await updateTeamSetting(
      { brandColor: values.brandColor, darkBrandColor: values.darkBrandColor },
      (updatedTeam) => {
        resetBrandColors({
          brandColor: updatedTeam?.brandColor || DEFAULT_LIGHT_BRAND_COLOR,
          darkBrandColor: updatedTeam?.darkBrandColor || DEFAULT_DARK_BRAND_COLOR,
        });
      }
    );
  };

  useEffect(() => {
    if (team?.theme) {
      themeForm.reset({
        theme: (team.theme as "light" | "dark" | null) ?? "system",
      });
    }
    if (team?.brandColor) {
      brandColorsForm.reset({
        brandColor: team.brandColor ?? undefined,
        darkBrandColor: team.darkBrandColor ?? undefined,
      });
    }
    // Set initial values for settings switches
    if (team) {
      setHideBrandingValue(team.hideTeamBranding ?? false);
      setHideBookATeamMember(team.hideBookATeamMember ?? false);
      setHideTeamProfileLink(team.hideTeamProfileLink ?? false);
    }
  }, [team, themeForm, brandColorsForm]);

  if (isLoading) {
    return <SkeletonLoader />;
  }

  if (error || !team) {
    router.push("/teams");
  }

  const brandColor = brandColorsForm.watch("brandColor");
  const darkBrandColor = brandColorsForm.watch("darkBrandColor");
  const isAdminOrOwner = team && checkIfMemberAdminorOwner(team.membership.role);

  return (
    <>
      {isAdminOrOwner ? (
        <div className="flex w-full flex-col space-y-6">
          {/* Theme Form */}
          <div className="border-subtle space-y-6 rounded-md border p-4">
            <Form {...themeForm} onSubmit={onThemeFormSubmit}>
              <div className="mb-6 flex items-center rounded-md text-sm">
                <div>
                  <p className="text-base font-semibold">{t("team_appearance_theme_title")}</p>
                  <p className="text-default text-xs">{t("team_appearance_theme_description")}</p>
                </div>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <ThemeCard
                  variant="system"
                  value="system"
                  label={t("theme_system")}
                  register={themeForm.register}
                  currentValue={themeForm.watch("theme")}
                />
                <ThemeCard
                  variant="light"
                  value="light"
                  label={t("light")}
                  register={themeForm.register}
                  currentValue={themeForm.watch("theme")}
                />
                <ThemeCard
                  variant="dark"
                  value="dark"
                  label={t("dark")}
                  register={themeForm.register}
                  currentValue={themeForm.watch("theme")}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isThemeSubmitting || !isThemeDirty}
                  loading={isThemeSubmitting}>
                  {t("update")}
                </Button>
              </div>
            </Form>
          </div>

          {/* Brand Colors Form */}
          <div className="border-subtle space-y-6 rounded-md border p-4">
            <Form {...brandColorsForm} onSubmit={onBrandColorsFormSubmit}>
              <div className="mb-6 flex items-center rounded-md text-sm">
                <div>
                  <p className="text-base font-semibold">{t("team_brand_colors_title")}</p>
                  <p className="text-default text-xs">{t("team_brand_colors_description")}</p>
                </div>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">{t("team_brand_color_light")}</label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="color"
                      value={brandColor}
                      onChange={(e) =>
                        brandColorsForm.setValue("brandColor", e.target.value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      className="h-8 w-8 p-0"
                    />
                    <Input
                      type="text"
                      value={brandColor}
                      onChange={(e) =>
                        brandColorsForm.setValue("brandColor", e.target.value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      placeholder="#007ee5"
                    />
                  </div>
                  {brandColorsForm.formState.errors.brandColor && (
                    <p className="text-xs text-red-600">
                      {brandColorsForm.formState.errors.brandColor.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">{t("team_brand_color_dark")}</label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="color"
                      value={darkBrandColor}
                      onChange={(e) =>
                        brandColorsForm.setValue("darkBrandColor", e.target.value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      className="h-8 w-8 p-0"
                    />
                    <Input
                      type="text"
                      value={darkBrandColor}
                      onChange={(e) =>
                        brandColorsForm.setValue("darkBrandColor", e.target.value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      placeholder="#fafafa"
                    />
                  </div>
                  {brandColorsForm.formState.errors.darkBrandColor && (
                    <p className="text-xs text-red-600">
                      {brandColorsForm.formState.errors.darkBrandColor.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isBrandColorsSubmitting || !isBrandColorsDirty}
                  loading={isBrandColorsSubmitting}>
                  {t("update")}
                </Button>
              </div>
            </Form>
          </div>

          {/* Toggle switches */}
          <div className="border-subtle flex flex-col space-y-6 rounded-md border p-4">
            <SettingsSwitch
              toggleSwitchAtTheEnd={true}
              title={t("disable_cal_id_branding", { appName: APP_NAME })}
              disabled={mutation?.isPending}
              description={t("remove_cal_id_branding", { appName: APP_NAME })}
              checked={hideBrandingValue}
              onCheckedChange={async (checked) => {
                setHideBrandingValue(checked);
                await updateTeamSetting({ hideTeamBranding: checked });
              }}
            />
          </div>

          <div className="border-subtle flex flex-col space-y-6 rounded-md border p-4">
            <SettingsSwitch
              toggleSwitchAtTheEnd={true}
              title={t("hide_book_a_team_member")}
              disabled={mutation?.isPending}
              description={t("hide_book_a_team_member_description", { appName: APP_NAME })}
              checked={hideBookATeamMember ?? false}
              onCheckedChange={async (checked) => {
                setHideBookATeamMember(checked);
                await updateTeamSetting({ hideBookATeamMember: checked });
              }}
            />
          </div>

          <div className="border-subtle flex flex-col space-y-6 rounded-md border p-4">
            <SettingsSwitch
              toggleSwitchAtTheEnd={true}
              title={t("hide_team_profile_link")}
              disabled={mutation?.isPending}
              description={t("hide_team_profile_link_description")}
              checked={hideTeamProfileLink ?? false}
              onCheckedChange={async (checked) => {
                setHideTeamProfileLink(checked);
                await updateTeamSetting({ hideTeamProfileLink: checked });
              }}
            />
          </div>
        </div>
      ) : (
        <div className="border-subtle rounded-md border p-4">
          <span className="text-default text-sm">{t("only_owner_can_change")}</span>
        </div>
      )}
    </>
  );
}
