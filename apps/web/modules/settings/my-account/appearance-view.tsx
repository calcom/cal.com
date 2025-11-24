"use client";

// import { Button } from "@calcom/ui/components/button";
import { Avatar } from "@calid/features/ui/components/avatar";
import { Button } from "@calid/features/ui/components/button";
import ThemeCard from "@calid/features/ui/components/card/theme-card";
import { triggerToast } from "@calid/features/ui/components/toast";
import { CustomBannerUploader, CustomImageUploader } from "@calid/features/ui/components/uploader";
import { revalidateSettingsAppearance } from "app/(use-page-wrapper)/settings/(settings-layout)/my-account/appearance/actions";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";

import { BookerLayoutSelector } from "@calcom/features/settings/BookerLayoutSelector";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { APP_NAME } from "@calcom/lib/constants";
import { DEFAULT_LIGHT_BRAND_COLOR, DEFAULT_DARK_BRAND_COLOR } from "@calcom/lib/constants";
import { getBrandLogoUrl } from "@calcom/lib/getAvatarUrl";
import { checkWCAGContrastColor } from "@calcom/lib/getBrandColours";
import useGetBrandingColours from "@calcom/lib/getBrandColours";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useTheme from "@calcom/lib/hooks/useTheme";
import { validateBookerLayouts } from "@calcom/lib/validateBookerLayouts";
import { localStorage } from "@calcom/lib/webstorage";
import type { userMetadata } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { UpgradeTeamsBadge } from "@calcom/ui/components/badge";
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

const AppearanceView = ({
  user,
  hasPaidPlan,
}: {
  user: RouterOutputs["viewer"]["me"]["get"];
  hasPaidPlan: boolean;
}) => {
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

  const userAppThemeFormMethods = useForm({
    defaultValues: {
      appTheme: user.appTheme,
    },
  });

  const {
    formState: { isSubmitting: isUserAppThemeSubmitting, isDirty: isUserAppThemeDirty },
    reset: resetUserAppThemeReset,
  } = userAppThemeFormMethods;

  const userThemeFormMethods = useForm({
    defaultValues: {
      theme: user.theme,
    },
  });

  const {
    formState: { isSubmitting: isUserThemeSubmitting, isDirty: isUserThemeDirty },
    reset: resetUserThemeReset,
  } = userThemeFormMethods;

  const bannerFormMethods = useForm({
    defaultValues: {
      bannerUrl: user.bannerUrl,
    },
  });

  const {
    formState: { isSubmitting: isBannerFormSubmitting, isDirty: isBannerFormDirty },
  } = bannerFormMethods;

  const faviconFormMethods = useForm({
    defaultValues: {
      faviconUrl: user.faviconUrl,
    },
  });

  const {
    formState: { isSubmitting: isFaviconFormSubmitting, isDirty: isFaviconFormDirty },
  } = faviconFormMethods;

  const bookerLayoutFormMethods = useForm({
    defaultValues: {
      metadata: user.metadata as z.infer<typeof userMetadata>,
    },
  });

  const {
    formState: { isSubmitting: isBookerLayoutFormSubmitting, isDirty: isBookerLayoutFormDirty },
    reset: resetBookerLayoutThemeReset,
  } = bookerLayoutFormMethods;

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

  const selectedTheme = userThemeFormMethods.watch("theme");
  const selectedThemeIsDark =
    selectedTheme === "dark" ||
    (selectedTheme === "" &&
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"));

  const mutation = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: async (data) => {
      await utils.viewer.me.invalidate();
      revalidateSettingsAppearance();
      triggerToast(t("settings_updated_successfully"), "success");
      resetBrandColorsThemeReset({ brandColor: data.brandColor, darkBrandColor: data.darkBrandColor });
      resetBookerLayoutThemeReset({ metadata: data.metadata });
      resetUserThemeReset({ theme: data.theme });
      resetUserAppThemeReset({ appTheme: data.appTheme });
    },
    onError: (error) => {
      if (error.message) {
        triggerToast(error.message, "error");
      } else {
        triggerToast(t("error_updating_settings"), "error");
      }
    },
    onSettled: async () => {
      await utils.viewer.me.invalidate();
      revalidateSettingsAppearance();
    },
  });
  const [orgBase64, setOrgBase64] = useState<string>(user.bannerUrl || "");

  const [showPreview, setShowPreview] = useState<boolean>(false);
  return (
    <SettingsHeader
      title={t("appearance")}
      description={t("appearance_description")}
      borderInShellHeader={false}>
      <div className="border-default mt-6 flex items-center rounded-b-none rounded-t-lg border-x border-t px-6 pt-6 text-sm">
        <div>
          <p className="text-default text-sm font-semibold">{t("app_theme")}</p>
          <p className="text-subtle tex-sm">{t("app_theme_applies_note")}</p>
        </div>
      </div>
      <Form
        form={userAppThemeFormMethods}
        handleSubmit={({ appTheme }) => {
          if (appTheme === "system") {
            appTheme = null;
            localStorage.removeItem(`app-theme`);
          }
          mutation.mutate({
            appTheme,
          });
        }}>
        <div className="border-default rounded-b-lg border-x border-b">
          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
            <ThemeCard
              variant="system"
              value="system"
              label={t("theme_system")}
              defaultChecked={user.appTheme === null}
              register={userAppThemeFormMethods.register}
              fieldName="appTheme"
              currentValue={userAppThemeFormMethods.watch("appTheme")}
            />
            <ThemeCard
              variant="light"
              value="light"
              label={t("light")}
              defaultChecked={user.appTheme === "light"}
              register={userAppThemeFormMethods.register}
              fieldName="appTheme"
              currentValue={userAppThemeFormMethods.watch("appTheme")}
            />
            <ThemeCard
              variant="dark"
              value="dark"
              label={t("dark")}
              defaultChecked={user.appTheme === "dark"}
              register={userAppThemeFormMethods.register}
              fieldName="appTheme"
              currentValue={userAppThemeFormMethods.watch("appTheme")}
            />
          </div>
          <div className="flex flex-row justify-start px-6 pb-4">
            <Button
              loading={mutation.isPending}
              disabled={isUserAppThemeSubmitting || !isUserAppThemeDirty}
              type="submit"
              data-testid="update-app-theme-btn"
              color="primary">
              {t("update")}
            </Button>
          </div>
        </div>
      </Form>

      {isApartOfOrganization ? null : (
        <>
          <div className="border-default mt-6 flex items-center rounded-b-none rounded-t-lg border-x border-t px-6 pt-6 text-sm">
            <div>
              <p className="text-default text-sm font-semibold">{t("theme")}</p>
              <p className="text-subtle text-sm">{t("theme_applies_note")}</p>
            </div>
          </div>
          <Form
            form={userThemeFormMethods}
            handleSubmit={({ theme }) => {
              if (theme === "light" || theme === "dark") {
                mutation.mutate({
                  theme,
                });
                return;
              }
              mutation.mutate({
                theme: null,
              });
            }}>
            <div className="border-default rounded-b-lg border-x border-b">
              <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
                <ThemeCard
                  variant="system"
                  value="system"
                  label={t("theme_system")}
                  defaultChecked={user.theme === null}
                  register={userThemeFormMethods.register}
                  fieldName="theme"
                  currentValue={userThemeFormMethods.watch("theme")}
                />
                <ThemeCard
                  variant="light"
                  value="light"
                  label={t("light")}
                  defaultChecked={user.theme === "light"}
                  register={userThemeFormMethods.register}
                  fieldName="theme"
                  currentValue={userThemeFormMethods.watch("theme")}
                />
                <ThemeCard
                  variant="dark"
                  value="dark"
                  label={t("dark")}
                  defaultChecked={user.theme === "dark"}
                  register={userThemeFormMethods.register}
                  fieldName="theme"
                  currentValue={userThemeFormMethods.watch("theme")}
                />
              </div>

              <div className="flex flex-row justify-start px-6 pb-4">
                <Button
                  loading={mutation.isPending}
                  disabled={isUserThemeSubmitting || !isUserThemeDirty}
                  type="submit"
                  data-testid="update-theme-btn"
                  color="primary">
                  {t("update")}
                </Button>
              </div>
            </div>
          </Form>
          <Form
            form={bookerLayoutFormMethods}
            className="mt-6"
            handleSubmit={(values) => {
              const layoutError = validateBookerLayouts(values?.metadata?.defaultBookerLayouts || null);
              if (layoutError) {
                triggerToast(t(layoutError), "error");
                return;
              } else {
                mutation.mutate(values);
              }
            }}>
            <BookerLayoutSelector
              isDark={selectedThemeIsDark}
              name="metadata.defaultBookerLayouts"
              title={t("bookerlayout_user_settings_title")}
              description={t("bookerlayout_user_settings_description")}
              isDisabled={isBookerLayoutFormSubmitting || !isBookerLayoutFormDirty}
              isLoading={mutation.isPending}
              user={user}
            />
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

          <Form
            form={headerUrlFormMethods}
            handleSubmit={(values) => {
              mutation.mutate(values);
            }}>
            <div className="border-subtle mt-6 rounded-md border p-6">
              <Controller
                control={headerUrlFormMethods.control}
                name="metadata.headerUrl"
                render={({ field: { value, onChange } }) => {
                  const showRemoveLogoButton = value !== null;
                  return (
                    <div className="flex flex-col items-start">
                      <Label>{t("booking_page_header_background")}</Label>
                      <span className="text-subtle mb-8 text-sm">
                        {t("booking_page_header_background_description")}
                      </span>
                      <div className="bg-muted mb-8 flex h-60 w-full items-center justify-start rounded-lg">
                        {!value ? (
                          <div className="bg-cal-gradient dark:bg-cal-gradient h-full w-full" />
                        ) : (
                          <img className="h-full w-full" src={value} />
                        )}
                      </div>
                      <div className="flex gap-2">
                        <CustomBannerUploader
                          target="metadata.headerUrl"
                          id="svg-upload"
                          buttonMsg={t("upload_image")}
                          mimeType="image/svg+xml"
                          height={600}
                          width={3200}
                          handleAvatarChange={(newHeaderUrl) => {
                            onChange(newHeaderUrl);
                            mutation.mutate({
                              metadata: { headerUrl: newHeaderUrl },
                            });
                          }}
                          imageSrc={
                            getPlaceholderHeader(
                              value,
                              headerUrlFormMethods.getValues("metadata.headerUrl")
                            ) ?? undefined
                          }
                          triggerButtonColor={showRemoveLogoButton ? "secondary" : "primary"}
                        />
                        {showRemoveLogoButton && (
                          <Button
                            color="secondary"
                            onClick={() => {
                              onChange(null);
                              mutation.mutate({ metadata: { headerUrl: null } });
                            }}>
                            {t("remove")}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
            </div>
          </Form>

          <div className="border-subtle mt-6 rounded-md border p-6">
            <SettingsToggle
              toggleSwitchAtTheEnd={true}
              title={t("disable_branding")}
              disabled={!hasPaidPlan || mutation?.isPending}
              description={t("removes_cal_branding", { appName: APP_NAME })}
              checked={hasPaidPlan ? hideBrandingValue : false}
              Badge={<UpgradeTeamsBadge />}
              onCheckedChange={(checked) => {
                setHideBrandingValue(checked);
                if (!checked) {
                  // Clear custom branding when disabling
                  bannerFormMethods.setValue("bannerUrl", null, { shouldDirty: false });
                  faviconFormMethods.setValue("faviconUrl", null, { shouldDirty: false });
                  setOrgBase64("");
                  mutation.mutate({ hideBranding: checked, bannerUrl: "delete", faviconUrl: "delete" });
                } else {
                  mutation.mutate({ hideBranding: checked });
                }
              }}
            />

            {hasPaidPlan && hideBrandingValue && (
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
                            <div className="text-sm">{t("custom_brand_logo")}</div>
                            <div className="text-subtle text-xs">{t("custom_brand_logo_description")}</div>
                          </div>
                          <Button color="secondary" size="sm">
                            {t("preview")}
                          </Button>
                        </div>

                        <div className="mt-4 flex flex-row items-center gap-6">
                          <Avatar imageSrc={getBrandLogoUrl({ bannerUrl: value })} size="lg" alt="" />
                          <div className="flex items-center gap-3">
                            <div className="w-[105px]">
                              <CustomBannerUploader
                                // height={400}
                                // width={400}
                                target="logo"
                                fieldName="Logo"
                                // uploadInstruction={t("org_logo_instructions", { height: 100, width: 400 })}
                                id="logo-upload"
                                buttonMsg={t("upload_logo")}
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
                                <p className="mx-auto">{t("remove")}</p>
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

            {hasPaidPlan && hideBrandingValue && (
              <Form
                form={faviconFormMethods}
                handleSubmit={(values) => {
                  if (values.faviconUrl === null) {
                    values.faviconUrl = "delete";
                  }
                  mutation.mutate(values);
                }}>
                {/* {showPreview && (
                  <div className="flex flex-col justify-end gap-4">
                    <UserFoundUI base64={orgBase64} />
                    <LinkPreview base64={orgBase64} />
                  </div>
                )} */}
                <Controller
                  control={faviconFormMethods.control}
                  name="faviconUrl"
                  render={({ field: { value, onChange } }) => {
                    const showRemoveFaviconButton = !!value;

                    return (
                      <div>
                        <div className="mt-6 flex flex-row justify-between">
                          <div className="flex flex-col">
                            <div className="text-sm">{t("custom_brand_favicon")}</div>
                            <div className="text-subtle text-xs">{t("custom_brand_favicon_description")}</div>
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
                              <div className="flex  gap-2">
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
                                    <p className="mx-auto">{t("remove")}</p>
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
        </>
      )}
    </SettingsHeader>
  );
};

export default AppearanceView;
