"use client";

import { Avatar } from "@calid/features/ui/components/avatar";
import { Button } from "@calid/features/ui/components/button";
import { SocialIcon } from "@calid/features/ui/components/icon";
import { TextField } from "@calid/features/ui/components/input/input";
import { Label } from "@calid/features/ui/components/label";
import { triggerToast } from "@calid/features/ui/components/toast";
import { CustomBannerUploader, CustomImageUploader } from "@calid/features/ui/components/uploader";
import { revalidateSettingsCustomBranding } from "app/(use-page-wrapper)/settings/(settings-layout)/my-account/custom-branding/actions";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { APP_NAME } from "@calcom/lib/constants";
import { DEFAULT_LIGHT_BRAND_COLOR, DEFAULT_DARK_BRAND_COLOR } from "@calcom/lib/constants";
import { getPlaceholderHeader } from "@calcom/lib/defaultHeaderImage";
import { getBrandLogoUrl } from "@calcom/lib/getAvatarUrl";
import { checkWCAGContrastColor } from "@calcom/lib/getBrandColours";
import useGetBrandingColours from "@calcom/lib/getBrandColours";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useTheme from "@calcom/lib/hooks/useTheme";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { SettingsToggle, ColorPicker, Form } from "@calcom/ui/components/form";
import { useCalcomTheme } from "@calcom/ui/styles";

const useBrandColors = (
  currentTheme: string | null,
  {
    brandColor,
    darkBrandColor,
  }: {
    brandColor?: string | null;
    darkBrandColor?: string | null;
  }
): void => {
  const brandTheme = useGetBrandingColours({
    lightVal: brandColor,
    darkVal: darkBrandColor,
  });
  const selectedTheme = currentTheme ? brandTheme[currentTheme as "light" | "dark"] : {};
  useCalcomTheme({
    root: selectedTheme,
  });
};

const CustomBrandingView = ({ user }: { user: RouterOutputs["viewer"]["me"]["get"] }) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const session = useSession();
  const isApartOfOrganization = session.data?.user.org?.id;
  const [darkModeError, setDarkModeError] = useState(false);
  const [lightModeError, setLightModeError] = useState(false);
  const [isCustomBrandColorChecked, setIsCustomBranColorChecked] = useState(
    user?.brandColor !== DEFAULT_LIGHT_BRAND_COLOR || user?.darkBrandColor !== DEFAULT_DARK_BRAND_COLOR
  );
  const [hideBrandingValue, setHideBrandingValue] = useState(user?.hideBranding ?? false);
  useTheme(user?.appTheme);
  useBrandColors(user?.appTheme ?? null, {
    brandColor: user?.brandColor,
    darkBrandColor: user?.darkBrandColor,
  });

  const DEFAULT_BRAND_COLOURS = {
    light: user.brandColor ?? DEFAULT_LIGHT_BRAND_COLOR,
    dark: user.darkBrandColor ?? DEFAULT_DARK_BRAND_COLOR,
  };

  const brandColorsFormMethods = useForm({
    defaultValues: {
      brandColor: DEFAULT_BRAND_COLOURS.light,
      darkBrandColor: DEFAULT_BRAND_COLOURS.dark,
    },
  });

  const {
    formState: { isSubmitting: isBrandColorsFormSubmitting, isDirty: isBrandColorsFormDirty },
    reset: resetBrandColorsThemeReset,
  } = brandColorsFormMethods;

  const bannerFormMethods = useForm({
    defaultValues: {
      bannerUrl: user.bannerUrl,
    },
  });

  const {
    formState: { isSubmitting: _isBannerFormSubmitting, isDirty: _isBannerFormDirty },
  } = bannerFormMethods;

  const faviconFormMethods = useForm({
    defaultValues: {
      faviconUrl: user.faviconUrl,
    },
  });

  const {
    formState: { isSubmitting: _isFaviconFormSubmitting, isDirty: _isFaviconFormDirty },
  } = faviconFormMethods;

  const DEFAULT_SOCIAL_PROFILES = {
    linkedin: (user.socialProfiles as { linkedin?: string } | null)?.linkedin ?? "",
    facebook: (user.socialProfiles as { facebook?: string } | null)?.facebook ?? "",
    twitter: (user.socialProfiles as { twitter?: string } | null)?.twitter ?? "",
    instagram: (user.socialProfiles as { instagram?: string } | null)?.instagram ?? "",
    youtube: (user.socialProfiles as { youtube?: string } | null)?.youtube ?? "",
    github: (user.socialProfiles as { github?: string } | null)?.github ?? "",
  };

  const hasSocialProfiles = Object.values(DEFAULT_SOCIAL_PROFILES).some(
    (value) => value && value.trim() !== ""
  );
  const [isSocialProfilesEnabled, setIsSocialProfilesEnabled] = useState(hasSocialProfiles);

  const socialProfilesFormMethods = useForm({
    defaultValues: {
      socialProfiles: DEFAULT_SOCIAL_PROFILES,
    },
  });

  const {
    formState: { isSubmitting: isSocialProfilesFormSubmitting, isDirty: isSocialProfilesFormDirty },
    reset: resetSocialProfilesForm,
  } = socialProfilesFormMethods;

  const mutation = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: async (data) => {
      await utils.viewer.me.invalidate();
      revalidateSettingsCustomBranding();
      triggerToast(t("settings_updated_successfully"), "success");
      resetBrandColorsThemeReset({ brandColor: data.brandColor, darkBrandColor: data.darkBrandColor });
      if (data.socialProfiles) {
        const hasProfiles = Object.values(data.socialProfiles as Record<string, string>).some(
          (value) => value && value.trim() !== ""
        );
        setIsSocialProfilesEnabled(hasProfiles);
        resetSocialProfilesForm({ socialProfiles: data.socialProfiles as typeof DEFAULT_SOCIAL_PROFILES });
      }
      setUploadingBanner(false);
    },
    onError: (error) => {
      setUploadingBanner(false);
      if (error.message) {
        triggerToast(error.message, "error");
      } else {
        triggerToast(t("error_updating_settings"), "error");
      }
    },
    onSettled: async () => {
      await utils.viewer.me.invalidate();
      revalidateSettingsCustomBranding();
    },
  });
  const [_orgBase64, setOrgBase64] = useState<string>(user.bannerUrl || "");
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const bannerUrl = (isPrismaObjOrUndefined(user.metadata)?.headerUrl as string | null) ?? null;

  const handleBannerUpdate = async (newHeaderUrl: string | null) => {
    setUploadingBanner(true);
    mutation.mutate({
      metadata: {
        ...isPrismaObjOrUndefined(user.metadata),
        headerUrl: newHeaderUrl,
      },
    });
  };

  if (isApartOfOrganization) {
    return (
      <SettingsHeader
        title={t("custom_branding")}
        description={t("custom_branding_description")}
        borderInShellHeader={false}>
        <div className="border-subtle mt-6 rounded-md border p-6">
          <p className="text-subtle text-sm">{t("custom_branding_not_available_for_org")}</p>
        </div>
      </SettingsHeader>
    );
  }

  return (
    <SettingsHeader
      title={t("custom_branding")}
      description={t("custom_branding_description")}
      borderInShellHeader={false}>
      <div className="border-subtle mt-6 rounded-md border p-6">
        <div className="flex flex-col">
          <Label>{t("booking_page_banner")}</Label>
          <span className="text-subtle mb-4 text-sm">{t("booking_page_banner_description")}</span>
          <div className="bg-muted mb-4 flex aspect-[10/1] w-full items-center justify-start overflow-hidden rounded-lg">
            {!bannerUrl ? (
              <div className="bg-cal-gradient dark:bg-cal-gradient h-full w-full" />
            ) : (
              <img className="h-full w-full object-cover" src={bannerUrl} alt="Header background" />
            )}
          </div>

          <div className="flex gap-2">
            <CustomBannerUploader
              target="metadata.headerUrl"
              id="header-upload"
              buttonMsg={t("upload_image")}
              uploading={uploadingBanner}
              fieldName="Banner"
              mimeType={["image/svg+xml", "image/png"]}
              height={320}
              width={3200}
              handleAvatarChange={async (newHeaderUrl) => {
                await handleBannerUpdate(newHeaderUrl);
              }}
              imageSrc={getPlaceholderHeader(bannerUrl, bannerUrl) ?? undefined}
              triggerButtonColor={bannerUrl ? "secondary" : "primary"}
            />
            {bannerUrl && (
              <Button
                color="secondary"
                onClick={() => {
                  handleBannerUpdate(null);
                }}>
                {t("remove")}
              </Button>
            )}
          </div>
        </div>
      </div>
      <Form
        form={socialProfilesFormMethods}
        handleSubmit={(values) => {
          mutation.mutate({
            socialProfiles: values.socialProfiles,
          });
        }}>
        <div className="border-subtle mt-6 rounded-md border p-6">
          <SettingsToggle
            toggleSwitchAtTheEnd={true}
            title={t("social_profiles")}
            description={t("social_profiles_description")}
            checked={isSocialProfilesEnabled}
            onCheckedChange={(checked) => {
              setIsSocialProfilesEnabled(checked);
              if (!checked) {
                const emptyProfiles = {
                  linkedin: "",
                  facebook: "",
                  twitter: "",
                  instagram: "",
                  youtube: "",
                  github: "",
                };
                socialProfilesFormMethods.setValue("socialProfiles", emptyProfiles, {
                  shouldDirty: true,
                });
                mutation.mutate({
                  socialProfiles: emptyProfiles,
                });
              }
            }}
            childrenClassName="lg:ml-0">
            <div className="flex flex-col gap-4 py-6">
              <Controller
                name="socialProfiles.linkedin"
                control={socialProfilesFormMethods.control}
                render={({ field }) => (
                  <div>
                    <TextField
                      label={t("linkedin")}
                      placeholder="https://linkedin.com/in/yourprofile"
                      {...field}
                      addOnLeading={<SocialIcon name="linkedin" className="mr-1" />}
                    />
                  </div>
                )}
              />
              <Controller
                name="socialProfiles.facebook"
                control={socialProfilesFormMethods.control}
                render={({ field }) => (
                  <div>
                    <TextField
                      label={t("facebook")}
                      placeholder="https://facebook.com/yourprofile"
                      {...field}
                      addOnLeading={<SocialIcon name="facebook" className="mr-1" />}
                    />
                  </div>
                )}
              />
              <Controller
                name="socialProfiles.twitter"
                control={socialProfilesFormMethods.control}
                render={({ field }) => (
                  <div>
                    <TextField
                      label={t("twitter")}
                      placeholder="https://twitter.com/yourprofile"
                      {...field}
                      addOnLeading={<SocialIcon name="twitter" className="mr-1" />}
                    />
                  </div>
                )}
              />
              <Controller
                name="socialProfiles.instagram"
                control={socialProfilesFormMethods.control}
                render={({ field }) => (
                  <div>
                    <TextField
                      label={t("instagram")}
                      placeholder="https://instagram.com/yourprofile"
                      {...field}
                      addOnLeading={<SocialIcon name="instagram" className="mr-1" />}
                    />
                  </div>
                )}
              />
              <Controller
                name="socialProfiles.youtube"
                control={socialProfilesFormMethods.control}
                render={({ field }) => (
                  <div>
                    <TextField
                      label={t("youtube")}
                      placeholder="https://youtube.com/@yourchannel"
                      {...field}
                      addOnLeading={<SocialIcon name="youtube" className="mr-1" />}
                    />
                  </div>
                )}
              />
              <Controller
                name="socialProfiles.github"
                control={socialProfilesFormMethods.control}
                render={({ field }) => (
                  <div>
                    <TextField
                      label={t("github")}
                      placeholder="https://github.com/yourusername"
                      {...field}
                      addOnLeading={<SocialIcon name="github" className="mr-1" />}
                    />
                  </div>
                )}
              />
            </div>
            <Button
              loading={mutation.isPending}
              disabled={isSocialProfilesFormSubmitting || !isSocialProfilesFormDirty}
              color="primary"
              type="submit">
              {t("update")}
            </Button>
          </SettingsToggle>
        </div>
      </Form>
      <Form
        form={brandColorsFormMethods}
        handleSubmit={(values) => {
          mutation.mutate(values);
        }}>
        <div className="border-subtle mt-6 rounded-md border p-6">
          <SettingsToggle
            toggleSwitchAtTheEnd={true}
            title={t("custom_brand_colors")}
            description={t("customize_your_brand_colors")}
            checked={isCustomBrandColorChecked}
            onCheckedChange={(checked) => {
              setIsCustomBranColorChecked(checked);
              if (!checked) {
                mutation.mutate({
                  brandColor: DEFAULT_LIGHT_BRAND_COLOR,
                  darkBrandColor: DEFAULT_DARK_BRAND_COLOR,
                });
              }
            }}
            childrenClassName="lg:ml-0">
            <div className="flex flex-col gap-6 py-6">
              <Controller
                name="brandColor"
                control={brandColorsFormMethods.control}
                defaultValue={DEFAULT_BRAND_COLOURS.light}
                render={() => (
                  <div>
                    <p className="text-default block text-sm font-medium">{t("light_brand_color")}</p>
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
                          brandColorsFormMethods.setValue("brandColor", value, { shouldDirty: true });
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
                control={brandColorsFormMethods.control}
                defaultValue={DEFAULT_BRAND_COLOURS.dark}
                render={() => (
                  <div className="mt-6 sm:mt-0">
                    <p className="text-default block text-sm font-medium">{t("dark_brand_color")}</p>
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
                          brandColorsFormMethods.setValue("darkBrandColor", value, { shouldDirty: true });
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
              loading={mutation.isPending}
              disabled={isBrandColorsFormSubmitting || !isBrandColorsFormDirty}
              color="primary"
              type="submit">
              {t("update")}
            </Button>
          </SettingsToggle>
        </div>
      </Form>

      <div className="border-subtle mt-6 rounded-md border p-6">
        <SettingsToggle
          toggleSwitchAtTheEnd={true}
          title={t("custom_brand_logo_and_favicon")}
          disabled={mutation?.isPending}
          description={t("removes_cal_branding", { appName: APP_NAME })}
          checked={hideBrandingValue}
          onCheckedChange={(checked) => {
            setHideBrandingValue(checked);
            if (!checked) {
              bannerFormMethods.setValue("bannerUrl", null, { shouldDirty: false });
              faviconFormMethods.setValue("faviconUrl", null, { shouldDirty: false });
              setOrgBase64("");
              mutation.mutate({ hideBranding: checked, bannerUrl: "delete", faviconUrl: "delete" });
            } else {
              mutation.mutate({ hideBranding: checked });
            }
          }}
        />

        {hideBrandingValue && (
          <Form
            form={bannerFormMethods}
            handleSubmit={(values) => {
              if (values.bannerUrl === null) {
                values.bannerUrl = "delete";
              }
              mutation.mutate(values);
            }}>
            <Controller
              control={bannerFormMethods.control}
              name="bannerUrl"
              render={({ field: { value, onChange } }) => {
                const showRemoveAvatarButton = !!value;
                return (
                  <div>
                    <div className="mt-6 flex flex-row justify-between">
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
                            uploading={mutation.isPending}
                            handleAvatarChange={(newAvatar) => {
                              onChange(newAvatar);
                              setOrgBase64(newAvatar);
                              mutation.mutate({ bannerUrl: newAvatar });
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
                              mutation.mutate({ bannerUrl: "delete" });
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
        )}

        {hideBrandingValue && (
          <Form
            form={faviconFormMethods}
            handleSubmit={(values) => {
              if (values.faviconUrl === null) {
                values.faviconUrl = "delete";
              }
              mutation.mutate(values);
            }}>
            <Controller
              control={faviconFormMethods.control}
              name="faviconUrl"
              render={({ field: { value, onChange } }) => {
                const showRemoveFaviconButton = !!value;

                return (
                  <div>
                    <div className="mt-6 flex flex-row justify-between">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium">{t("brand_favicon")}</div>
                        <div className="text-subtle text-sm">{t("brand_favicon_description")}</div>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <div className="flex">
                        <Avatar
                          alt={user.name || "User Favicon"}
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
                                setOrgBase64(newAvatar);
                                onChange(newAvatar);
                                mutation.mutate({ faviconUrl: newAvatar });
                              }}
                              imageSrc={getBrandLogoUrl({ bannerUrl: value }, true)}
                            />

                            {showRemoveFaviconButton && (
                              <Button
                                color="secondary"
                                onClick={() => {
                                  onChange(null);
                                  mutation.mutate({ faviconUrl: "delete" });
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
        )}
      </div>
    </SettingsHeader>
  );
};

export default CustomBrandingView;
