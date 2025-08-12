"use client";

// import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calid/features/ui";
import { Avatar, Button } from "@calid/features/ui";
import { revalidateSettingsAppearance } from "app/(use-page-wrapper)/settings/(settings-layout)/my-account/appearance/actions";
import { revalidateHasTeamPlan } from "app/cache/membership";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";

import { BookerLayoutSelector } from "@calcom/features/settings/BookerLayoutSelector";
import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import ThemeLabel from "@calcom/features/settings/ThemeLabel";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { APP_NAME } from "@calcom/lib/constants";
import { DEFAULT_LIGHT_BRAND_COLOR, DEFAULT_DARK_BRAND_COLOR } from "@calcom/lib/constants";
import { checkWCAGContrastColor } from "@calcom/lib/getBrandColours";
import useGetBrandingColours from "@calcom/lib/getBrandColours";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useTheme from "@calcom/lib/hooks/useTheme";
import { validateBookerLayouts } from "@calcom/lib/validateBookerLayouts";
import type { userMetadata } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { UpgradeTeamsBadge } from "@calcom/ui/components/badge";
import { SettingsToggle, ColorPicker, Form } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
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
      revalidateHasTeamPlan();
      showToast(t("settings_updated_successfully"), "success");
      resetBrandColorsThemeReset({ brandColor: data.brandColor, darkBrandColor: data.darkBrandColor });
      resetBookerLayoutThemeReset({ metadata: data.metadata });
      resetUserThemeReset({ theme: data.theme });
      resetUserAppThemeReset({ appTheme: data.appTheme });
    },
    onError: (error) => {
      if (error.message) {
        showToast(error.message, "error");
      } else {
        showToast(t("error_updating_settings"), "error");
      }
    },
    onSettled: async () => {
      await utils.viewer.me.invalidate();
      revalidateSettingsAppearance();
      revalidateHasTeamPlan();
    },
  });

  return (
    <SettingsHeader
      title={t("appearance")}
      description={t("appearance_description")}
      borderInShellHeader={false}>
      <div className="border-subtle mt-6 flex items-center rounded-b-none rounded-t-lg border-x border-t px-6 pt-6 text-sm">
        <div>
          <p className="text-default text-base font-semibold">{t("app_theme")}</p>
          <p className="text-default">{t("app_theme_applies_note")}</p>
        </div>
      </div>
      <Form
        form={userAppThemeFormMethods}
        handleSubmit={({ appTheme }) => {
          if (appTheme === "system") appTheme = null;
          mutation.mutate({
            appTheme,
          });
        }}>
        <div className="border-subtle flex flex-col justify-between border-x px-6 pb-4 pt-8 sm:flex-row">
          <ThemeLabel
            variant="system"
            value="system"
            label={t("theme_system")}
            defaultChecked={user.appTheme === null}
            register={userAppThemeFormMethods.register}
            fieldName="appTheme"
          />
          <ThemeLabel
            variant="light"
            value="light"
            label={t("light")}
            defaultChecked={user.appTheme === "light"}
            register={userAppThemeFormMethods.register}
            fieldName="appTheme"
          />
          <ThemeLabel
            variant="dark"
            value="dark"
            label={t("dark")}
            defaultChecked={user.appTheme === "dark"}
            register={userAppThemeFormMethods.register}
            fieldName="appTheme"
          />
        </div>
        <div className="border-subtle flex flex-row justify-start rounded-b-lg border-x border-b px-6 pb-4">
          <Button
            loading={mutation.isPending}
            disabled={isUserAppThemeSubmitting || !isUserAppThemeDirty}
            type="submit"
            data-testid="update-app-theme-btn"
            color="primary">
            {t("update")}
          </Button>
        </div>
      </Form>

      {isApartOfOrganization ? null : (
        <>
          <div className="border-subtle mt-6 flex items-center rounded-b-none rounded-t-lg border-x border-t px-6 pt-6 text-sm">
            <div>
              <p className="text-default text-base font-semibold">{t("theme")}</p>
              <p className="text-default">{t("theme_applies_note")}</p>
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
            <div className="border-subtle flex flex-col justify-between border-x px-6 pb-4 pt-8 sm:flex-row">
              <ThemeLabel
                variant="system"
                value="system"
                label={t("theme_system")}
                defaultChecked={user.theme === null}
                register={userThemeFormMethods.register}
              />
              <ThemeLabel
                variant="light"
                value="light"
                label={t("light")}
                defaultChecked={user.theme === "light"}
                register={userThemeFormMethods.register}
              />
              <ThemeLabel
                variant="dark"
                value="dark"
                label={t("dark")}
                defaultChecked={user.theme === "dark"}
                register={userThemeFormMethods.register}
              />
            </div>

            <div className="border-subtle flex flex-row justify-start rounded-b-lg border-x border-b px-6 pb-4">
              <Button
                loading={mutation.isPending}
                disabled={isUserThemeSubmitting || !isUserThemeDirty}
                type="submit"
                data-testid="update-theme-btn"
                color="primary">
                {t("update")}
              </Button>
            </div>
          </Form>

          <Form
            form={bookerLayoutFormMethods}
            className="mt-6"
            handleSubmit={(values) => {
              const layoutError = validateBookerLayouts(values?.metadata?.defaultBookerLayouts || null);
              if (layoutError) {
                showToast(t(layoutError), "error");
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
                titleToggle={true}
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
                        <p className="text-default mb-2 block text-sm font-medium">
                          {t("light_brand_color")}
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
                        <p className="text-default mb-2 block text-sm font-medium">{t("dark_brand_color")}</p>
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

          {/* TODO future PR to preview brandColors */}
          {/* <Button
        color="secondary"
        EndIcon="external-link"
        className="mt-6"
        onClick={() => window.open(`${WEBAPP_URL}/${user.username}/${user.eventTypes[0].title}`, "_blank")}>
        Preview
      </Button> */}

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
                mutation.mutate({ hideBranding: checked });
              }}
            />
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
              <Avatar size="lg" />

              <Button color="secondary" size="base" className="h-[36px]">
                <Icon name="upload" className="h-4 w-4" />
                {t("upload_logo")}
              </Button>
            </div>

            <div className="mt-6 flex flex-row justify-between">
              <div className="flex flex-col">
                <div className="text-sm">{t("custom_brand_favicon")}</div>
                <div className="text-subtle text-xs">{t("custom_brand_favicon_description")}</div>
              </div>
            </div>

            <div className="mt-4 flex flex-row items-center gap-6">
              <Avatar size="lg" />

              <Button color="secondary" size="base" className="h-[36px]">
                <Icon name="upload" className="h-4 w-4" />
                {t("upload_favicon")}
              </Button>
            </div>
          </div>
        </>
      )}
    </SettingsHeader>
  );
};

export default AppearanceView;
