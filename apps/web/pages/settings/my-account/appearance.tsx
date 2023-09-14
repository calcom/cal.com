import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";

import { BookerLayoutSelector } from "@calcom/features/settings/BookerLayoutSelector";
import ThemeLabel from "@calcom/features/settings/ThemeLabel";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { classNames } from "@calcom/lib";
import { APP_NAME } from "@calcom/lib/constants";
import { checkWCAGContrastColor } from "@calcom/lib/getBrandColours";
import { useHasPaidPlan } from "@calcom/lib/hooks/useHasPaidPlan";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { validateBookerLayouts } from "@calcom/lib/validateBookerLayouts";
import type { userMetadata } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
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
  NewToggle,
  UpgradeTeamsBadge,
} from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import SectionBottomActions from "@components/settings/SectionBottomActions";

const SkeletonLoader = ({ title, description }: { title: string; description: string }) => {
  return (
    <SkeletonContainer>
      <Meta title={title} description={description} />
      <div className="mb-8 mt-6 space-y-6">
        <div className="flex items-center">
          <SkeletonButton className="mr-6 h-32 w-48 rounded-md p-5" />
          <SkeletonButton className="mr-6 h-32 w-48 rounded-md p-5" />
          <SkeletonButton className="mr-6 h-32 w-48 rounded-md p-5" />
        </div>
        <div className="flex justify-between">
          <SkeletonText className="h-8 w-1/3" />
          <SkeletonText className="h-8 w-1/3" />
        </div>

        <SkeletonText className="h-8 w-full" />

        <SkeletonButton className="mr-6 h-8 w-20 rounded-md p-5" />
      </div>
    </SkeletonContainer>
  );
};

const DEFAULT_LIGHT_BRAND_COLOR = "#292929";
const DEFAULT_DARK_BRAND_COLOR = "#fafafa";

const AppearanceView = () => {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const { data: user, isLoading } = trpc.viewer.me.useQuery();
  const [darkModeError, setDarkModeError] = useState(false);
  const [lightModeError, setLightModeError] = useState(false);
  const [isCustomBrandColorChecked, setIsCustomBranColorChecked] = useState(
    user?.brandColor !== DEFAULT_LIGHT_BRAND_COLOR && user?.darkBrandColor !== DEFAULT_DARK_BRAND_COLOR
  );
  const [hideBrandingValue, setHideBrandingValue] = useState(user?.hideBranding ?? false);

  const { isLoading: isTeamPlanStatusLoading, hasPaidPlan } = useHasPaidPlan();

  const formMethods = useForm({
    defaultValues: {
      theme: user?.theme,
      brandColor: user?.brandColor || "#292929",
      darkBrandColor: user?.darkBrandColor || "#fafafa",
      hideBranding: user?.hideBranding,
      metadata: user?.metadata as z.infer<typeof userMetadata>,
    },
  });

  const userThemeFormMethods = useForm({
    defaultValues: {
      theme: user?.theme,
    },
  });

  const {
    formState: { isSubmitting: isUserThemeSubmitting, isDirty: isUserThemeDirty },
    reset: isUserThemeReset,
  } = userThemeFormMethods;

  const bookerLayoutFormMethods = useForm({
    defaultValues: {
      metadata: user?.metadata as z.infer<typeof userMetadata>,
    },
  });

  const {
    formState: { isSubmitting: isBookerLayoutFormSubmitting, isDirty: isBookerLayoutFormDirty },
    reset: isBookerLayoutThemeReset,
  } = bookerLayoutFormMethods;

  const brandColorsFormMethods = useForm({
    defaultValues: {
      brandColor: user?.brandColor || "#292929",
      darkBrandColor: user?.darkBrandColor || "#fafafa",
    },
  });

  const {
    formState: { isSubmitting: isBrandColorsFormSubmitting, isDirty: isBrandColorsFormDirty },
    reset: isBrandColorsThemeReset,
  } = brandColorsFormMethods;

  const selectedTheme = formMethods.watch("theme");
  const selectedThemeIsDark =
    selectedTheme === "dark" ||
    (selectedTheme === "" &&
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"));

  const {
    formState: { isSubmitting, isDirty },
    reset,
  } = formMethods;

  const mutation = trpc.viewer.updateProfile.useMutation({
    onSuccess: async (data) => {
      await utils.viewer.me.invalidate();
      showToast(t("settings_updated_successfully"), "success");
      reset(data);
    },
    onError: (error) => {
      if (error.message) {
        showToast(error.message, "error");
      } else {
        showToast(t("error_updating_settings"), "error");
      }
    },
  });

  if (isLoading || isTeamPlanStatusLoading)
    return <SkeletonLoader title={t("appearance")} description={t("appearance_description")} />;

  if (!user) return null;

  const isDisabled = isSubmitting || !isDirty;

  return (
    <div>
      <Meta title={t("appearance")} description={t("appearance_description")} borderInShellHeader={false} />
      <div className="border-subtle mt-6 flex items-center rounded-t-xl border p-6 text-sm">
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
            theme: values.theme || null,
          });
        }}>
        <div className="border-subtle flex flex-col justify-between border-x px-6 py-8 sm:flex-row">
          <ThemeLabel
            variant="system"
            value={null}
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
          if (layoutError) throw new Error(t(layoutError));
          mutation.mutate(values);
        }}>
        <BookerLayoutSelector
          isDark={selectedThemeIsDark}
          name="metadata.defaultBookerLayouts"
          title={t("bookerlayout_user_settings_title")}
          description={t("bookerlayout_user_settings_description")}
          isDisabled={isBookerLayoutFormSubmitting || !isBookerLayoutFormDirty}
        />
      </Form>

      <Form
        form={brandColorsFormMethods}
        handleSubmit={(values) => {
          mutation.mutate(values);
        }}>
        <div className="mt-6">
          <NewToggle
            title={t("custom_brand_colors")}
            description={t("customize_your_brand_colors")}
            checked={isCustomBrandColorChecked}
            onCheckedChange={(checked) => {
              setIsCustomBranColorChecked(checked);
            }}
            childrenClassName="lg:ml-0"
            switchContainerClassName={classNames("p-6 border-subtle rounded-xl border", "rounded-b-none")}>
            <div className="border-subtle flex flex-col gap-6 border-x p-6">
              <Controller
                name="brandColor"
                control={brandColorsFormMethods.control}
                defaultValue={user.brandColor}
                render={() => (
                  <div>
                    <p className="text-default mb-2 block text-sm font-medium">{t("light_brand_color")}</p>
                    <ColorPicker
                      defaultValue={user.brandColor}
                      resetDefaultValue="#292929"
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
                        <Alert
                          severity="warning"
                          message="Light Theme color doesn't pass contrast check. We recommend you change this colour so your buttons will be more visible."
                        />
                      </div>
                    ) : null}
                  </div>
                )}
              />

              <Controller
                name="darkBrandColor"
                control={brandColorsFormMethods.control}
                defaultValue={user.darkBrandColor}
                render={() => (
                  <div className="mt-6 sm:mt-0">
                    <p className="text-default mb-2 block text-sm font-medium">{t("dark_brand_color")}</p>
                    <ColorPicker
                      defaultValue={user.darkBrandColor}
                      resetDefaultValue="#fafafa"
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
                        <Alert
                          severity="warning"
                          message="Dark Theme color doesn't pass contrast check. We recommend you change this colour so your buttons will be more visible."
                        />
                      </div>
                    ) : null}
                  </div>
                )}
              />
            </div>
            <SectionBottomActions align="end">
              <Button
                loading={isLoading}
                disabled={isBrandColorsFormSubmitting || !isBrandColorsFormDirty}
                color="primary"
                type="submit">
                {t("update")}
              </Button>
            </SectionBottomActions>
          </NewToggle>
        </div>
      </Form>

      {/* TODO future PR to preview brandColors */}
      {/* <Button
        color="secondary"
        EndIcon={ExternalLink}
        className="mt-6"
        onClick={() => window.open(`${WEBAPP_URL}/${user.username}/${user.eventTypes[0].title}`, "_blank")}>
        Preview
      </Button> */}
      <div className="border-subtle mt-6 rounded-xl border p-6">
        <NewToggle
          title={t("disable_cal_branding", { appName: APP_NAME })}
          disabled={!hasPaidPlan || mutation?.isLoading}
          description={t("removes_cal_branding", { appName: APP_NAME })}
          checked={hasPaidPlan ? hideBrandingValue : false}
          Badge={<UpgradeTeamsBadge />}
          onCheckedChange={(checked) => {
            setHideBrandingValue(checked);
            mutation.mutate({ hideBranding: checked });
          }}
        />
      </div>
    </div>
  );
};

AppearanceView.getLayout = getLayout;
AppearanceView.PageWrapper = PageWrapper;

export default AppearanceView;
