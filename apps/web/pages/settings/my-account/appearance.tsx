"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";

import { BookerLayoutSelector } from "@calcom/features/settings/BookerLayoutSelector";
import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import ThemeLabel from "@calcom/features/settings/ThemeLabel";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { APP_NAME } from "@calcom/lib/constants";
import { DEFAULT_LIGHT_BRAND_COLOR, DEFAULT_DARK_BRAND_COLOR } from "@calcom/lib/constants";
import { checkWCAGContrastColor } from "@calcom/lib/getBrandColours";
import useGetBrandingColours from "@calcom/lib/getBrandColours";
import { useHasPaidPlan } from "@calcom/lib/hooks/useHasPaidPlan";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useTheme from "@calcom/lib/hooks/useTheme";
import { validateBookerLayouts } from "@calcom/lib/validateBookerLayouts";
import type { userMetadata } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import {
  Alert,
  Button,
  ColorPicker,
  Form,
  Meta,
  showToast,
  SkeletonButton,
  SkeletonContainer,
  SkeletonText,
  SettingsToggle,
  UpgradeTeamsBadge,
  useCalcomTheme,
} from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const SkeletonLoader = ({ title, description }: { title: string; description: string }) => {
  return (
    <SkeletonContainer>
      <Meta title={title} description={description} borderInShellHeader={false} />
      <div className="border-subtle mt-6 flex items-center rounded-t-xl border p-6 text-sm">
        <SkeletonText className="h-8 w-1/3" />
      </div>
      <div className="border-subtle space-y-6 border-x px-4 py-6 sm:px-6">
        <div className="[&>*]:bg-emphasis flex w-full items-center justify-center gap-x-2 [&>*]:animate-pulse">
          <div className="h-32 flex-1 rounded-md p-5" />
          <div className="h-32 flex-1 rounded-md p-5" />
          <div className="h-32 flex-1 rounded-md p-5" />
        </div>
        <div className="flex justify-between">
          <SkeletonText className="h-8 w-1/3" />
          <SkeletonText className="h-8 w-1/3" />
        </div>

        <SkeletonText className="h-8 w-full" />
      </div>
      <div className="rounded-b-lg">
        <SectionBottomActions align="end">
          <SkeletonButton className="mr-6 h-8 w-20 rounded-md p-5" />
        </SectionBottomActions>
      </div>
    </SkeletonContainer>
  );
};

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
  user: RouterOutputs["viewer"]["me"];
  hasPaidPlan: boolean;
}) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
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

  const mutation = trpc.viewer.updateProfile.useMutation({
    onSuccess: async (data) => {
      await utils.viewer.me.invalidate();
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
    },
  });

  return (
    <div>
      <Meta title={t("appearance")} description={t("appearance_description")} borderInShellHeader={false} />
      <div className="border-subtle mt-6 flex items-center rounded-t-lg border p-6 text-sm">
        <div>
          <p className="text-default text-base font-semibold">{t("app_theme")}</p>
          <p className="text-default">{t("app_theme_applies_note")}</p>
        </div>
      </div>
      <Form
        form={userAppThemeFormMethods}
        handleSubmit={(values) => {
          mutation.mutate({
            appTheme: values.appTheme ?? null,
          });
        }}>
        <div className="border-subtle flex flex-col justify-between border-x px-6 py-8 sm:flex-row">
          <ThemeLabel
            variant="system"
            value={undefined}
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
            disabled={isUserAppThemeSubmitting || !isUserAppThemeDirty}
            type="submit"
            data-testid="update-app-theme-btn"
            color="primary">
            {t("update")}
          </Button>
        </SectionBottomActions>
      </Form>

      <div className="border-subtle mt-6 flex items-center rounded-t-lg border p-6 text-sm">
        <div>
          <p className="text-default text-base font-semibold">{t("theme")}</p>
          <p className="text-default">{t("theme_applies_note")}</p>
        </div>
      </div>
      <Form
        form={userThemeFormMethods}
        handleSubmit={(values) => {
          mutation.mutate({
            // Radio values don't support null as values, therefore we convert an empty string
            // back to null here.
            theme: values.theme ?? null,
          });
        }}>
        <div className="border-subtle flex flex-col justify-between border-x px-6 py-8 sm:flex-row">
          <ThemeLabel
            variant="system"
            value={undefined}
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
                    <p className="text-default mb-2 block text-sm font-medium">{t("light_brand_color")}</p>
                    <ColorPicker
                      defaultValue={DEFAULT_BRAND_COLOURS.light}
                      resetDefaultValue={DEFAULT_LIGHT_BRAND_COLOR}
                      onChange={(value) => {
                        try {
                          checkWCAGContrastColor("#ffffff", value);
                          setLightModeError(false);
                          brandColorsFormMethods.setValue("brandColor", value, { shouldDirty: true });
                        } catch (err) {
                          setLightModeError(false);
                        }
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
                        try {
                          checkWCAGContrastColor("#101010", value);
                          setDarkModeError(false);
                          brandColorsFormMethods.setValue("darkBrandColor", value, { shouldDirty: true });
                        } catch (err) {
                          setDarkModeError(true);
                        }
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
        Badge={<UpgradeTeamsBadge />}
        onCheckedChange={(checked) => {
          setHideBrandingValue(checked);
          mutation.mutate({ hideBranding: checked });
        }}
        switchContainerClassName="mt-6"
      />
    </div>
  );
};

const AppearanceViewWrapper = () => {
  const { data: user, isPending } = trpc.viewer.me.useQuery();
  const { isPending: isTeamPlanStatusLoading, hasPaidPlan } = useHasPaidPlan();

  const { t } = useLocale();

  if (isPending || isTeamPlanStatusLoading || !user)
    return <SkeletonLoader title={t("appearance")} description={t("appearance_description")} />;

  return <AppearanceView user={user} hasPaidPlan={hasPaidPlan} />;
};

AppearanceViewWrapper.getLayout = getLayout;
AppearanceViewWrapper.PageWrapper = PageWrapper;

export default AppearanceViewWrapper;
