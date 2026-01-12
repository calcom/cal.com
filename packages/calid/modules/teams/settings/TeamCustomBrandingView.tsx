"use client";

import { Avatar } from "@calid/features/ui/components/avatar";
import { Button } from "@calid/features/ui/components/button";
import { Form } from "@calid/features/ui/components/form";
import { Label } from "@calid/features/ui/components/label";
import { SettingsSwitch } from "@calid/features/ui/components/switch/settings-switch";
import { triggerToast } from "@calid/features/ui/components/toast";
import { CustomBannerUploader, CustomImageUploader } from "@calid/features/ui/components/uploader";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { DEFAULT_LIGHT_BRAND_COLOR, DEFAULT_DARK_BRAND_COLOR } from "@calcom/lib/constants";
import { getPlaceholderHeader } from "@calcom/lib/defaultHeaderImage";
import { getBrandLogoUrl } from "@calcom/lib/getAvatarUrl";
import { checkWCAGContrastColor } from "@calcom/lib/getBrandColours";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { SettingsToggle, ColorPicker } from "@calcom/ui/components/form";
import { revalidateCalIdTeamDataCache } from "@calcom/web/app/(booking-page-wrapper)/team/[slug]/[type]/actions";

import SkeletonLoader from "../components/SkeletonLoader";
import { checkIfMemberAdminorOwner } from "../lib/checkIfMemberAdminorOwner";

const brandColorsFormSchema = z.object({
  brandColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color format"),
  darkBrandColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid hex color format"),
});

type TeamBrandColorsSetting = {
  brandColor: string;
  darkBrandColor: string;
};

interface TeamCustomBrandingViewProps {
  teamId: number;
}

export default function TeamCustomBrandingView({ teamId }: TeamCustomBrandingViewProps) {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();

  const {
    data: team,
    isLoading,
    error,
  } = trpc.viewer.calidTeams.get.useQuery({ teamId }, { enabled: !!teamId });

  const [hideBrandingValue, setHideBrandingValue] = useState(!!(team?.bannerUrl || team?.faviconUrl));
  const [isCustomBrandColorChecked, setIsCustomBrandColorChecked] = useState(
    team?.brandColor !== DEFAULT_LIGHT_BRAND_COLOR || team?.darkBrandColor !== DEFAULT_DARK_BRAND_COLOR
  );
  const [darkModeError, setDarkModeError] = useState(false);
  const [lightModeError, setLightModeError] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingPublicBanner, setUploadingPublicBanner] = useState(false);

  const brandColorsForm = useForm<TeamBrandColorsSetting>({
    resolver: zodResolver(brandColorsFormSchema),
    defaultValues: {
      brandColor: team?.brandColor || DEFAULT_LIGHT_BRAND_COLOR,
      darkBrandColor: team?.darkBrandColor || DEFAULT_DARK_BRAND_COLOR,
    },
  });

  const bannerFormMethods = useForm({
    defaultValues: {
      bannerUrl: team?.bannerUrl,
    },
  });

  const faviconFormMethods = useForm({
    defaultValues: {
      faviconUrl: team?.faviconUrl,
    },
  });

  const publicBannerFormMethods = useForm({
    defaultValues: {
      headerUrl: (isPrismaObjOrUndefined(team?.metadata)?.headerUrl as string | null) ?? null,
    },
  });

  const {
    control,
    formState: { isSubmitting: isBrandColorsSubmitting, isDirty: isBrandColorsDirty },
    reset: resetBrandColors,
  } = brandColorsForm;

  const mutation = trpc.viewer.calidTeams.update.useMutation();

  const updateTeamSetting = async (
    payload: Record<string, unknown>,
    afterUpdate?: (team: {
      brandColor?: string | null;
      darkBrandColor?: string | null;
      slug?: string | null;
    }) => void
  ) => {
    try {
      const updatedTeam = await mutation.mutateAsync({ id: teamId, ...payload });
      triggerToast(t("team_settings_updated_successfully"), "success");
      await utils.viewer.calidTeams.get.invalidate({ teamId });
      if (updatedTeam?.slug) {
        await revalidateCalIdTeamDataCache({
          teamSlug: updatedTeam.slug,
        });
      }
      if (afterUpdate && updatedTeam) {
        afterUpdate({
          brandColor: updatedTeam.brandColor,
          darkBrandColor: updatedTeam.darkBrandColor,
          slug: updatedTeam.slug,
        });
      }
    } catch (error: unknown) {
      triggerToast(error instanceof Error ? error.message : String(error), "error");
    }
  };

  const onBrandColorsFormSubmit = async (values: TeamBrandColorsSetting) => {
    await updateTeamSetting(
      { brandColor: values.brandColor, darkBrandColor: values.darkBrandColor },
      (updatedTeam) => {
        resetBrandColors({
          brandColor: updatedTeam?.brandColor || DEFAULT_LIGHT_BRAND_COLOR,
          darkBrandColor: updatedTeam?.darkBrandColor || DEFAULT_DARK_BRAND_COLOR,
        });
        setIsCustomBrandColorChecked(
          (updatedTeam?.brandColor || DEFAULT_LIGHT_BRAND_COLOR) !== DEFAULT_LIGHT_BRAND_COLOR ||
            (updatedTeam?.darkBrandColor || DEFAULT_DARK_BRAND_COLOR) !== DEFAULT_DARK_BRAND_COLOR
        );
      }
    );
  };

  useEffect(() => {
    if (team?.brandColor) {
      brandColorsForm.reset({
        brandColor: team.brandColor ?? undefined,
        darkBrandColor: team.darkBrandColor ?? undefined,
      });
    }
    if (team) {
      setHideBrandingValue(!!(team.bannerUrl || team.faviconUrl));
      setIsCustomBrandColorChecked(
        team.brandColor !== DEFAULT_LIGHT_BRAND_COLOR || team.darkBrandColor !== DEFAULT_DARK_BRAND_COLOR
      );
      bannerFormMethods.reset({ bannerUrl: team.bannerUrl });
      faviconFormMethods.reset({ faviconUrl: team.faviconUrl });
      publicBannerFormMethods.reset({
        headerUrl: (isPrismaObjOrUndefined(team.metadata)?.headerUrl as string | null) ?? null,
      });
    }
  }, [team, brandColorsForm, bannerFormMethods, faviconFormMethods, publicBannerFormMethods]);

  if (isLoading) {
    return <SkeletonLoader />;
  }

  if (error || !team) {
    router.push("/teams");
  }

  const isAdminOrOwner = team && checkIfMemberAdminorOwner(team.membership.role);

  const DEFAULT_BRAND_COLOURS = {
    light: team?.brandColor ?? DEFAULT_LIGHT_BRAND_COLOR,
    dark: team?.darkBrandColor ?? DEFAULT_DARK_BRAND_COLOR,
  };

  const publicBannerUrl = (isPrismaObjOrUndefined(team?.metadata)?.headerUrl as string | null) ?? null;

  const handlePublicBannerUpdate = async (newHeaderUrl: string | null) => {
    setUploadingPublicBanner(true);
    try {
      await updateTeamSetting({
        metadata: {
          ...isPrismaObjOrUndefined(team?.metadata),
          headerUrl: newHeaderUrl,
        },
      });
      publicBannerFormMethods.reset({ headerUrl: newHeaderUrl });
    } finally {
      setUploadingPublicBanner(false);
    }
  };

  return (
    <>
      {isAdminOrOwner ? (
        <div className="flex w-full flex-col space-y-6">
          <div className="border-default flex flex-col space-y-6 rounded-md border p-4">
            <div className="flex flex-col">
              <Label>{t("booking_page_banner")}</Label>
              <span className="text-subtle mb-4 text-sm">{t("booking_page_banner_description")}</span>
              <div className="bg-muted mb-4 flex aspect-[10/1] w-full items-center justify-start overflow-hidden rounded-lg">
                {!publicBannerUrl ? (
                  <div className="bg-cal-gradient dark:bg-cal-gradient h-full w-full" />
                ) : (
                  <img className="h-full w-full object-cover" src={publicBannerUrl} alt="Header background" />
                )}
              </div>

              <div className="flex gap-2">
                <CustomBannerUploader
                  target="metadata.headerUrl"
                  id="public-banner-upload"
                  buttonMsg={t("upload_image")}
                  uploading={uploadingPublicBanner}
                  fieldName="Banner"
                  mimeType={["image/svg+xml", "image/png"]}
                  height={320}
                  width={3200}
                  handleAvatarChange={async (newHeaderUrl) => {
                    await handlePublicBannerUpdate(newHeaderUrl);
                  }}
                  imageSrc={getPlaceholderHeader(publicBannerUrl, publicBannerUrl) ?? undefined}
                  triggerButtonColor={publicBannerUrl ? "secondary" : "primary"}
                />
                {publicBannerUrl && (
                  <Button
                    color="secondary"
                    onClick={() => {
                      handlePublicBannerUpdate(null);
                    }}>
                    {t("remove")}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="border-default space-y-6 rounded-md border p-4">
            <Form form={brandColorsForm} {...brandColorsForm} onSubmit={onBrandColorsFormSubmit}>
              <SettingsToggle
                toggleSwitchAtTheEnd={true}
                title={t("custom_brand_colors")}
                description={t("customize_your_brand_colors")}
                checked={isCustomBrandColorChecked}
                onCheckedChange={(checked) => {
                  setIsCustomBrandColorChecked(checked);
                  if (!checked) {
                    updateTeamSetting({
                      brandColor: DEFAULT_LIGHT_BRAND_COLOR,
                      darkBrandColor: DEFAULT_DARK_BRAND_COLOR,
                    }).then(() => {
                      resetBrandColors({
                        brandColor: DEFAULT_LIGHT_BRAND_COLOR,
                        darkBrandColor: DEFAULT_DARK_BRAND_COLOR,
                      });
                    });
                  }
                }}
                childrenClassName="lg:ml-0">
                <div className="flex flex-col gap-6 py-6">
                  <Controller
                    name="brandColor"
                    control={control}
                    defaultValue={DEFAULT_BRAND_COLOURS.light}
                    render={() => (
                      <div>
                        <p className="text-default block text-sm font-medium">
                          {t("team_brand_color_light")}
                        </p>
                        <div className="flex flex-row justify-start">
                          <ColorPicker
                            defaultValue={DEFAULT_BRAND_COLOURS.light}
                            resetDefaultValue={DEFAULT_LIGHT_BRAND_COLOR}
                            onChange={(value) => {
                              if (checkWCAGContrastColor("#ffffff", value)) {
                                setLightModeError(false);
                              } else {
                                setLightModeError(true);
                              }
                              brandColorsForm.setValue("brandColor", value, { shouldDirty: true });
                            }}
                          />
                        </div>
                        {lightModeError ? (
                          <div className="mt-4">
                            <Alert severity="warning" message={t("light_theme_contrast_error")} />
                          </div>
                        ) : null}
                      </div>
                    )}
                  />

                  <Controller
                    name="darkBrandColor"
                    control={control}
                    defaultValue={DEFAULT_BRAND_COLOURS.dark}
                    render={() => (
                      <div className="mt-6 sm:mt-0">
                        <p className="text-default block text-sm font-medium">{t("team_brand_color_dark")}</p>
                        <div className="flex flex-row justify-start">
                          <ColorPicker
                            defaultValue={DEFAULT_BRAND_COLOURS.dark}
                            resetDefaultValue={DEFAULT_DARK_BRAND_COLOR}
                            onChange={(value) => {
                              if (checkWCAGContrastColor("#101010", value)) {
                                setDarkModeError(false);
                              } else {
                                setDarkModeError(true);
                              }
                              brandColorsForm.setValue("darkBrandColor", value, { shouldDirty: true });
                            }}
                          />
                        </div>
                        {darkModeError ? (
                          <div className="mt-4">
                            <Alert severity="warning" message={t("dark_theme_contrast_error")} />
                          </div>
                        ) : null}
                      </div>
                    )}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isBrandColorsSubmitting || !isBrandColorsDirty}
                  loading={isBrandColorsSubmitting}>
                  {t("update")}
                </Button>
              </SettingsToggle>
            </Form>
          </div>

          <div className="border-default flex flex-col space-y-6 rounded-md border p-4">
            <SettingsSwitch
              toggleSwitchAtTheEnd={true}
              title={t("custom_brand_logo_and_favicon")}
              disabled={mutation?.isPending}
              description={t("removes_cal_branding")}
              checked={hideBrandingValue}
              onCheckedChange={async (checked) => {
                if (!checked) {
                  bannerFormMethods.setValue("bannerUrl", null, { shouldDirty: false });
                  faviconFormMethods.setValue("faviconUrl", null, { shouldDirty: false });
                  await updateTeamSetting({
                    bannerUrl: "delete",
                    faviconUrl: "delete",
                  });
                  setHideBrandingValue(false);
                } else {
                  setHideBrandingValue(true);
                }
              }}
            />

            {hideBrandingValue && (
              <>
                <Form
                  form={bannerFormMethods}
                  handleSubmit={(values) => {
                    if (values.bannerUrl === null) {
                      values.bannerUrl = "delete";
                    }
                    updateTeamSetting({ bannerUrl: values.bannerUrl });
                  }}>
                  <Controller
                    control={bannerFormMethods.control}
                    name="bannerUrl"
                    render={({ field: { value, onChange } }) => {
                      const showRemoveAvatarButton = !!value;
                      return (
                        <div>
                          <div className="flex flex-row justify-between">
                            <div className="flex flex-col">
                              <div className="text-sm font-medium">{t("brand_logo")}</div>
                              <div className="text-subtle text-sm">{t("brand_logo_description")}</div>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-row items-center gap-6">
                            <Avatar imageSrc={getBrandLogoUrl({ bannerUrl: value })} size="lg" alt="" />
                            <div className="flex items-center gap-3">
                              <div className="w-[105px]">
                                <CustomBannerUploader
                                  target="logo"
                                  fieldName="Logo"
                                  id="logo-upload"
                                  buttonMsg={t("upload_logo")}
                                  uploading={mutation.isPending || uploadingBanner}
                                  handleAvatarChange={(newAvatar) => {
                                    setUploadingBanner(true);
                                    onChange(newAvatar);
                                    updateTeamSetting({ bannerUrl: newAvatar })
                                      .then(() => {
                                        const faviconValue = faviconFormMethods.getValues("faviconUrl");
                                        setHideBrandingValue(!!(newAvatar || faviconValue));
                                      })
                                      .finally(() => {
                                        setUploadingBanner(false);
                                      });
                                  }}
                                  imageSrc={getBrandLogoUrl({ bannerUrl: value })}
                                  mimeType="image/*"
                                />
                              </div>
                              {showRemoveAvatarButton && (
                                <Button
                                  color="secondary"
                                  onClick={() => {
                                    onChange(null);
                                    updateTeamSetting({ bannerUrl: "delete" }).then(() => {
                                      const faviconValue = faviconFormMethods.getValues("faviconUrl");
                                      if (!faviconValue) {
                                        setHideBrandingValue(false);
                                      }
                                    });
                                  }}>
                                  {t("remove")}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                </Form>

                <Form
                  form={faviconFormMethods}
                  handleSubmit={(values) => {
                    if (values.faviconUrl === null) {
                      values.faviconUrl = "delete";
                    }
                    updateTeamSetting({ faviconUrl: values.faviconUrl });
                  }}>
                  <Controller
                    control={faviconFormMethods.control}
                    name="faviconUrl"
                    render={({ field: { value, onChange } }) => {
                      const showRemoveFaviconButton = !!value;

                      return (
                        <div>
                          <div className="flex flex-row justify-between">
                            <div className="flex flex-col">
                              <div className="text-sm font-medium">{t("brand_favicon")}</div>
                              <div className="text-subtle text-sm">{t("brand_favicon_description")}</div>
                            </div>
                          </div>

                          <div className="mt-3 flex gap-2">
                            <div className="flex">
                              <Avatar
                                alt={team?.name || "Team Favicon"}
                                imageSrc={getBrandLogoUrl({ faviconUrl: value }, true)}
                                size="lg"
                              />
                              <div className="ms-4 flex items-center">
                                <div className="flex gap-2">
                                  <CustomImageUploader
                                    target="avatar"
                                    fieldName="favicon"
                                    id="avatar-upload"
                                    buttonMsg={t("upload_favicon")}
                                    handleAvatarChange={(newAvatar) => {
                                      setUploadingBanner(true);
                                      onChange(newAvatar);
                                      updateTeamSetting({ faviconUrl: newAvatar })
                                        .then(() => {
                                          const bannerValue = bannerFormMethods.getValues("bannerUrl");
                                          setHideBrandingValue(!!(bannerValue || newAvatar));
                                        })
                                        .finally(() => {
                                          setUploadingBanner(false);
                                        });
                                    }}
                                    imageSrc={getBrandLogoUrl({ faviconUrl: value }, true)}
                                  />

                                  {showRemoveFaviconButton && (
                                    <Button
                                      color="secondary"
                                      onClick={() => {
                                        onChange(null);
                                        updateTeamSetting({ faviconUrl: "delete" }).then(() => {
                                          const bannerValue = bannerFormMethods.getValues("bannerUrl");
                                          if (!bannerValue) {
                                            setHideBrandingValue(false);
                                          }
                                        });
                                      }}>
                                      {t("remove")}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                </Form>
              </>
            )}
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
