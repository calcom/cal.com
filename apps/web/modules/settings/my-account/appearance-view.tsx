"use client";

import { APP_NAME, DEFAULT_DARK_BRAND_COLOR, DEFAULT_LIGHT_BRAND_COLOR } from "@calcom/lib/constants";
import useGetBrandingColours, { checkWCAGContrastColor } from "@calcom/lib/getBrandColours";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useTheme from "@calcom/lib/hooks/useTheme";
import { validateBookerLayouts } from "@calcom/lib/validateBookerLayouts";
import type { userMetadata } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { ColorPicker, Form } from "@calcom/ui/components/form";
import { useCalcomTheme } from "@calcom/ui/styles";
import { Alert, AlertDescription } from "@coss/ui/components/alert";
import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameAction,
  CardFrameDescription,
  CardFrameFooter,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@coss/ui/components/collapsible";
import { Field, FieldItem } from "@coss/ui/components/field";
import { Fieldset } from "@coss/ui/components/fieldset";
import { Label } from "@coss/ui/components/label";
import { Radio, RadioGroup } from "@coss/ui/components/radio-group";
import { Switch } from "@coss/ui/components/switch";
import { toastManager } from "@coss/ui/components/toast";
import { TriangleAlertIcon } from "@coss/ui/icons";
import { SelectablePreviewOption } from "@coss/ui/shared/selectable-preview-option";
import { SettingsToggle } from "@coss/ui/shared/settings-toggle";
import { revalidateSettingsAppearance } from "app/(use-page-wrapper)/settings/(settings-layout)/my-account/appearance/actions";
import { revalidateHasTeamPlan } from "app/cache/membership";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";
import { WideUpgradeBannerForBranding } from "~/billing/upgrade-banners/WideUpgradeBannerForBranding";
import { BookerLayoutSelector } from "~/settings/components/BookerLayoutSelector";

const themeItems = [
  { imageSrc: "/theme-system.svg", labelKey: "theme_system", value: "system" },
  { imageSrc: "/theme-light.svg", labelKey: "light", value: "light" },
  { imageSrc: "/theme-dark.svg", labelKey: "dark", value: "dark" },
] as const;

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
  const hasCustomBrandColors =
    (brandColor ?? DEFAULT_LIGHT_BRAND_COLOR) !== DEFAULT_LIGHT_BRAND_COLOR ||
    (darkBrandColor ?? DEFAULT_DARK_BRAND_COLOR) !== DEFAULT_DARK_BRAND_COLOR;

  const brandTheme = useGetBrandingColours({
    lightVal: brandColor,
    darkVal: darkBrandColor,
  });
  const selectedTheme =
    hasCustomBrandColors && currentTheme ? brandTheme[currentTheme as "light" | "dark"] : {};
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
  const [isCustomBrandColorChecked, setIsCustomBrandColorChecked] = useState(
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

  const selectedAppTheme = userAppThemeFormMethods.watch("appTheme");
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
      toastManager.add({ title: t("settings_updated_successfully"), type: "success" });
      resetBrandColorsThemeReset({ brandColor: data.brandColor, darkBrandColor: data.darkBrandColor });
      resetBookerLayoutThemeReset({ metadata: data.metadata });
      resetUserThemeReset({ theme: data.theme });
      resetUserAppThemeReset({ appTheme: data.appTheme });
    },
    onError: (error) => {
      if (error.message) {
        toastManager.add({ title: error.message, type: "error" });
      } else {
        toastManager.add({ title: t("error_updating_settings"), type: "error" });
      }
    },
    onSettled: async () => {
      await utils.viewer.me.invalidate();
      revalidateSettingsAppearance();
      revalidateHasTeamPlan();
    },
  });

  const handleCustomBrandColorsToggle = (checked: boolean) => {
    if (isCustomBrandColorChecked === checked) return;
    setIsCustomBrandColorChecked(checked);
    setLightModeError(false);
    setDarkModeError(false);
    if (!checked) {
      mutation.mutate({
        brandColor: DEFAULT_LIGHT_BRAND_COLOR,
        darkBrandColor: DEFAULT_DARK_BRAND_COLOR,
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Form
        form={userAppThemeFormMethods}
        handleSubmit={({ appTheme }) => {
          if (appTheme === "system") appTheme = null;
          mutation.mutate({
            appTheme,
          });
        }}>
        <CardFrame>
          <CardFrameHeader>
            <CardFrameTitle>{t("app_theme")}</CardFrameTitle>
            <CardFrameDescription>{t("app_theme_applies_note")}</CardFrameDescription>
          </CardFrameHeader>
          <Card>
            <CardPanel>
              <Field className="max-w-none gap-4" name="appTheme" render={(props) => <Fieldset {...props} />}>
                <RadioGroup
                  className="flex w-full sm:flex-row gap-4 md:gap-6"
                  value={(selectedAppTheme ?? "system") as "system" | "light" | "dark"}
                  onValueChange={(value) => {
                    userAppThemeFormMethods.setValue("appTheme", value === "system" ? null : value, {
                      shouldDirty: true,
                    });
                  }}>
                  {themeItems.map((item) => (
                    <FieldItem className="flex-1" key={item.value} data-testid={`appTheme-${item.value}`}>
                      <SelectablePreviewOption
                        control={
                          <Radio
                            className="peer col-start-1 row-start-2 shrink-0 max-sm:hidden"
                            value={item.value}
                          />
                        }
                        preview={
                          <Image
                            alt={t(item.labelKey)}
                            src={item.imageSrc}
                            fill
                            sizes="(min-width: 0) 100vw"
                            className="size-full object-cover object-center shadow-xs"
                          />
                        }
                        label={t(item.labelKey)}
                      />
                    </FieldItem>
                  ))}
                </RadioGroup>
              </Field>
            </CardPanel>
          </Card>
          <CardFrameFooter className="flex justify-end">
            <Button
              loading={mutation.isPending}
              disabled={isUserAppThemeSubmitting || !isUserAppThemeDirty}
              type="submit"
              data-testid="update-app-theme-btn">
              {t("update")}
            </Button>
          </CardFrameFooter>
        </CardFrame>
      </Form>

      {isApartOfOrganization ? null : (
        <>
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
            <CardFrame>
              <CardFrameHeader>
                <CardFrameTitle>{t("theme")}</CardFrameTitle>
                <CardFrameDescription>{t("theme_applies_note")}</CardFrameDescription>
              </CardFrameHeader>
              <Card>
                <CardPanel>
                  <Field
                    className="max-w-none gap-4"
                    name="theme"
                    render={(props) => <Fieldset {...props} />}>
                    <RadioGroup
                      className="flex w-full sm:flex-row gap-4 md:gap-6"
                      value={(selectedTheme ?? "system") as "system" | "light" | "dark"}
                      onValueChange={(value) => {
                        userThemeFormMethods.setValue("theme", value === "system" ? null : value, {
                          shouldDirty: true,
                        });
                      }}>
                      {themeItems.map((item) => (
                        <FieldItem className="flex-1" key={item.value} data-testid={`theme-${item.value}`}>
                          <SelectablePreviewOption
                            control={
                              <Radio
                                className="peer col-start-1 row-start-2 shrink-0 max-sm:hidden"
                                value={item.value}
                              />
                            }
                            preview={
                              <Image
                                alt={t(item.labelKey)}
                                src={item.imageSrc}
                                fill
                                sizes="(min-width: 0) 100vw"
                                className="size-full object-cover object-center shadow-xs"
                              />
                            }
                            label={t(item.labelKey)}
                          />
                        </FieldItem>
                      ))}
                    </RadioGroup>
                  </Field>
                </CardPanel>
              </Card>
              <CardFrameFooter className="flex justify-end">
                <Button
                  loading={mutation.isPending}
                  disabled={isUserThemeSubmitting || !isUserThemeDirty}
                  type="submit"
                  data-testid="update-theme-btn">
                  {t("update")}
                </Button>
              </CardFrameFooter>
            </CardFrame>
          </Form>

          <Form
            form={bookerLayoutFormMethods}
            handleSubmit={(values) => {
              const layoutError = validateBookerLayouts(values?.metadata?.defaultBookerLayouts || null);
              if (layoutError) {
                toastManager.add({ title: t(layoutError), type: "error" });
                return;
              } else {
                mutation.mutate(values);
              }
            }}>
            <CardFrame>
              <CardFrameHeader>
                <CardFrameTitle>{t("bookerlayout_user_settings_title")}</CardFrameTitle>
                <CardFrameDescription>{t("bookerlayout_user_settings_description")}</CardFrameDescription>
              </CardFrameHeader>
              <Card>
                <CardPanel>
                  <BookerLayoutSelector
                    isDark={selectedThemeIsDark}
                    name="metadata.defaultBookerLayouts"
                    hideHeader={true}
                    user={user}
                  />
                </CardPanel>
              </Card>
              <CardFrameFooter className="flex justify-end">
                <Button
                  loading={mutation.isPending}
                  type="submit"
                  disabled={isBookerLayoutFormSubmitting || !isBookerLayoutFormDirty}>
                  {t("update")}
                </Button>
              </CardFrameFooter>
            </CardFrame>
          </Form>

          <Form
            form={brandColorsFormMethods}
            handleSubmit={(values) => {
              mutation.mutate(values);
            }}>
            <CardFrame className="has-[[data-slot=collapsible-trigger][data-unchecked]]:before:bg-card before:transition-all" render={<Collapsible open={isCustomBrandColorChecked} onOpenChange={handleCustomBrandColorsToggle} />}>
              <CardFrameHeader className="has-[[data-slot=collapsible-trigger][data-unchecked]]:p-6 transition-all">
                <CardFrameTitle>{t("custom_brand_colors")}</CardFrameTitle>
                <CardFrameDescription>{t("customize_your_brand_colors")}</CardFrameDescription>
                <CardFrameAction>
                  <CollapsibleTrigger
                    nativeButton={false}
                    render={
                      <Switch
                        checked={isCustomBrandColorChecked}
                        onCheckedChange={handleCustomBrandColorsToggle}
                        aria-label={t("enable_custom_brand_colors")}
                      />
                    }
                  />
                </CardFrameAction>
              </CardFrameHeader>
              <Card render={<CollapsiblePanel className="data-ending-style:opacity-0 data-starting-style:opacity-0 transition-[height,opacity]" />}>
                <CardPanel>
                  <div className="flex flex-col gap-4">
                    <Controller
                      name="brandColor"
                      control={brandColorsFormMethods.control}
                      defaultValue={DEFAULT_BRAND_COLOURS.light}
                      render={() => (
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-2">
                            <Label render={<div />}>{t("light_brand_color")}</Label>
                            <ColorPicker
                              defaultValue={DEFAULT_BRAND_COLOURS.light}
                              resetDefaultValue={DEFAULT_LIGHT_BRAND_COLOR}
                              onChange={(value) => {
                                if (checkWCAGContrastColor("#ffffff", value)) {
                                  setLightModeError(false);
                                } else {
                                  setLightModeError(true);
                                }
                                brandColorsFormMethods.setValue("brandColor", value, {
                                  shouldDirty: true,
                                });
                              }}
                            />
                          </div>
                          {lightModeError ? (
                            <Alert variant="warning">
                              <TriangleAlertIcon />
                              <AlertDescription>{t("light_theme_contrast_error")}</AlertDescription>
                            </Alert>
                          ) : null}
                        </div>
                      )}
                    />

                    <Controller
                      name="darkBrandColor"
                      control={brandColorsFormMethods.control}
                      defaultValue={DEFAULT_BRAND_COLOURS.dark}
                      render={() => (
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-2">
                            <Label render={<div />}>{t("dark_brand_color")}</Label>
                            <ColorPicker
                              defaultValue={DEFAULT_BRAND_COLOURS.dark}
                              resetDefaultValue={DEFAULT_DARK_BRAND_COLOR}
                              onChange={(value) => {
                                if (checkWCAGContrastColor("#101010", value)) {
                                  setDarkModeError(false);
                                } else {
                                  setDarkModeError(true);
                                }
                                brandColorsFormMethods.setValue("darkBrandColor", value, {
                                  shouldDirty: true,
                                });
                              }}
                            />
                          </div>
                          {darkModeError ? (
                            <Alert variant="warning">
                              <TriangleAlertIcon />
                              <AlertDescription>{t("dark_theme_contrast_error")}</AlertDescription>
                            </Alert>
                          ) : null}
                        </div>
                      )}
                    />
                  </div>
                </CardPanel>
              </Card>
              <Collapsible open={isCustomBrandColorChecked}>
                <CollapsiblePanel className="data-ending-style:opacity-0 data-starting-style:opacity-0 transition-[height,opacity]">
                  <CardFrameFooter className="flex justify-end">
                    <Button
                      loading={mutation.isPending}
                      disabled={isBrandColorsFormSubmitting || !isBrandColorsFormDirty}
                      type="submit">
                      {t("update")}
                    </Button>
                  </CardFrameFooter>
                </CollapsiblePanel>
              </Collapsible>
            </CardFrame>
          </Form>

          {/* TODO future PR to preview brandColors */}
          {/* <Button
        color="secondary"
        EndIcon="external-link"
        className="mt-6"
        onClick={() => window.open(`${WEBAPP_URL}/${user.username}/${user.eventTypes[0].title}`, "_blank")}>
        Preview
      </Button> */}

          <div>
            <SettingsToggle
              title={t("disable_cal_branding", { appName: APP_NAME })}
              description={t("removes_cal_branding", { appName: APP_NAME })}
              checked={hideBrandingValue}
              disabled={mutation.isPending || !hasPaidPlan}
              onCheckedChange={(checked) => {
                if (!hasPaidPlan) return;
                setHideBrandingValue(checked);
                mutation.mutate({ hideBranding: checked });
              }}
            />
            {!hasPaidPlan ? <WideUpgradeBannerForBranding /> : null}
          </div>
        </>
      )}
    </div>
  );
};

export default AppearanceView;
