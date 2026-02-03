"use client";

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
import { Button } from "@calcom/ui/components/button";
import { SettingsToggle, ColorPicker, Form } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useCalcomTheme } from "@calcom/ui/styles";

import { UpgradeTeamsBadgeWebWrapper } from "~/billing/components/UpgradeTeamsBadgeWebWrapper";

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
    <SettingsHeader title={t("appearance")} description={t("appearance_description")}>
      <div className="border-subtle mt-6 flex items-center rounded-t-lg border p-6 text-sm">
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
        <div className="border-subtle flex flex-col justify-between border-x px-6 py-8 sm:flex-row">
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
        <SectionBottomActions className="mb-6" align="end">
          <Button
            loading={mutation.isPending}
            disabled={isUserAppThemeSubmitting || !isUserAppThemeDirty}
            type="submit"
            data-testid="update-app-theme-btn"
            color="primary">
            {t("update")}
          </Button>
        </SectionBottomActions>
      </Form>

      {isApartOfOrganization ? null : (
        <>
          <div className="border-subtle mt-6 flex items-center rounded-t-lg border p-6 text-sm">
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
            <div className="border-subtle flex flex-col justify-between border-x px-6 py-8 sm:flex-row">
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
            <SectionBottomActions className="mb-6" align="end">
              <Button
                loading={mutation.isPending}
                disabled={isUserThemeSubmitting || !isUserThemeDirty}
                type="submit"
                data-testid="update-theme-btn"
                color="primary">
                {t("update")}
              </Button>
            </SectionBottomActions>
          </Form>

          <Form
            form={bookerLayoutFormMethods}
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
            <div className="mt-6">
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
                <div className="border-subtle flex flex-col gap-6 border-x p-6">
                  <Controller
                    name="brandColor"
                    control={brandColorsFormMethods.control}
                    defaultValue={DEFAULT_BRAND_COLOURS.light}
                    render={() => (
                      <div>
                        <p className="text-default mb-2 block text-sm font-medium">
                          {t("light_brand_color")}
                        </p>
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
                        {darkModeError ? (
                          <div className="mt-4">
                            <Alert severity="warning" message={t("dark_theme_contrast_error")} />
                          </div>
                        ) : null}
                      </div>
                    )}
                  />
                </div>
                <SectionBottomActions align="end">
                  <Button
                    loading={mutation.isPending}
                    disabled={isBrandColorsFormSubmitting || !isBrandColorsFormDirty}
                    color="primary"
                    type="submit">
                    {t("update")}
                  </Button>
                </SectionBottomActions>
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

          <SettingsToggle
            toggleSwitchAtTheEnd={true}
            title={t("disable_cal_branding", { appName: APP_NAME })}
            disabled={!hasPaidPlan || mutation?.isPending}
            description={t("removes_cal_branding", { appName: APP_NAME })}
            checked={hasPaidPlan ? hideBrandingValue : false}
            Badge={<UpgradeTeamsBadgeWebWrapper />}
            onCheckedChange={(checked) => {
              setHideBrandingValue(checked);
              mutation.mutate({ hideBranding: checked });
            }}
            switchContainerClassName="mt-6"
          />
        </>
      )}
    </SettingsHeader>
  );
};

export default AppearanceView;
