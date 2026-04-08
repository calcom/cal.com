"use client";

import {
  APP_NAME,
  DEFAULT_DARK_BRAND_COLOR,
  DEFAULT_LIGHT_BRAND_COLOR,
} from "@calcom/lib/constants";
import { checkWCAGContrastColor } from "@calcom/lib/getBrandColours";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { bookingThemePreviewOptions } from "@calcom/lib/theme/themeItems";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { ColorPicker, Form } from "@calcom/ui/components/form";
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
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@coss/ui/components/collapsible";
import { Field, FieldItem } from "@coss/ui/components/field";
import { Fieldset } from "@coss/ui/components/fieldset";
import { Label } from "@coss/ui/components/label";
import { Radio, RadioGroup } from "@coss/ui/components/radio-group";
import { Switch } from "@coss/ui/components/switch";
import { toastManager } from "@coss/ui/components/toast";
import { TriangleAlertIcon } from "@coss/ui/icons";
import { SelectablePreviewOption } from "@coss/ui/shared/selectable-preview-option";
import { SettingsToggle } from "@coss/ui/shared/settings-toggle";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { AppearanceSkeletonLoader } from "~/settings/common/components/AppearanceSkeletonLoader";

type BrandColorsFormValues = {
  brandColor: string;
  darkBrandColor: string;
};

const OrgAppearanceView = ({
  currentOrg,
}: {
  currentOrg: RouterOutputs["viewer"]["organizations"]["listCurrent"];
}) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const [hideBrandingValue, setHideBrandingValue] = useState(
    currentOrg?.hideBranding ?? false
  );
  const [allowSEOIndexingValue, setAllowSEOIndexingValue] = useState(
    currentOrg?.organizationSettings?.allowSEOIndexing ?? false
  );
  const [
    orgProfileRedirectsToVerifiedDomainValue,
    setOrgProfileRedirectsToVerifiedDomainValue,
  ] = useState(
    currentOrg?.organizationSettings?.orgProfileRedirectsToVerifiedDomain ??
      false
  );
  const [darkModeError, setDarkModeError] = useState(false);
  const [lightModeError, setLightModeError] = useState(false);
  const [isCustomBrandColorChecked, setIsCustomBrandColorChecked] = useState(
    (currentOrg?.brandColor ?? DEFAULT_LIGHT_BRAND_COLOR) !==
      DEFAULT_LIGHT_BRAND_COLOR ||
      (currentOrg?.darkBrandColor ?? DEFAULT_DARK_BRAND_COLOR) !==
        DEFAULT_DARK_BRAND_COLOR
  );

  const themeForm = useForm<{ theme: string | null | undefined }>({
    defaultValues: {
      theme: currentOrg?.theme,
    },
  });

  const {
    formState: { isSubmitting: isOrgThemeSubmitting, isDirty: isOrgThemeDirty },
    reset: resetOrgThemeReset,
  } = themeForm;
  const selectedTheme = themeForm.watch("theme");

  const brandColorsFormMethods = useForm<BrandColorsFormValues>({
    defaultValues: {
      brandColor: currentOrg?.brandColor || DEFAULT_LIGHT_BRAND_COLOR,
      darkBrandColor: currentOrg?.darkBrandColor || DEFAULT_DARK_BRAND_COLOR,
    },
  });

  const {
    reset: resetBrandColors,
    formState: {
      isSubmitting: isBrandColorsFormSubmitting,
      isDirty: isBrandColorsFormDirty,
    },
  } = brandColorsFormMethods;

  const mutation = trpc.viewer.organizations.update.useMutation({
    onError: (err) => {
      toastManager.add({ title: err.message, type: "error" });
    },
    async onSuccess(res, variables) {
      await utils.viewer.teams.get.invalidate();
      await utils.viewer.organizations.listCurrent.invalidate();

      toastManager.add({
        title: t("your_org_updated_successfully"),
        type: "success",
      });
      if (res) {
        if ("theme" in variables) {
          resetOrgThemeReset({ theme: res.data.theme });
        }
        if ("brandColor" in variables || "darkBrandColor" in variables) {
          resetBrandColors({
            brandColor: res.data.brandColor ?? DEFAULT_LIGHT_BRAND_COLOR,
            darkBrandColor: res.data.darkBrandColor ?? DEFAULT_DARK_BRAND_COLOR,
          });
        }
      }
    },
  });

  const isSectionPending = (key: string) => {
    return (
      mutation.isPending && mutation.variables && key in mutation.variables
    );
  };

  const onBrandColorsFormSubmit = (values: BrandColorsFormValues) => {
    mutation.mutate(values);
  };

  const handleCustomBrandColorsToggle = (checked: boolean) => {
    if (isCustomBrandColorChecked === checked) return;
    if (isSectionPending("brandColor") || isSectionPending("darkBrandColor"))
      return;
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
        form={themeForm}
        handleSubmit={({ theme }) => {
          mutation.mutate({
            theme: theme === "light" || theme === "dark" ? theme : null,
          });
        }}
      >
        <CardFrame>
          <CardFrameHeader>
            <CardFrameTitle>{t("theme")}</CardFrameTitle>
            <CardFrameDescription>
              {t("theme_applies_note")}
            </CardFrameDescription>
          </CardFrameHeader>
          <Card>
            <CardPanel>
              <Field
                className="gap-4 max-w-none"
                name="theme"
                render={(props) => <Fieldset {...props} />}
              >
                <RadioGroup
                  className="flex gap-4 w-full sm:flex-row md:gap-6"
                  value={
                    (selectedTheme ?? "system") as "system" | "light" | "dark"
                  }
                  onValueChange={(value) => {
                    themeForm.setValue(
                      "theme",
                      value === "system" ? null : value,
                      { shouldDirty: true }
                    );
                  }}
                >
                    {bookingThemePreviewOptions.map((item) => (
                    <FieldItem className="flex-1" key={item.value}>
                      <SelectablePreviewOption
                        control={
                          <Radio
                            className="col-start-1 row-start-2 peer shrink-0 max-sm:hidden"
                            value={item.value}
                          />
                        }
                        preview={
                          <Image
                            alt={t(item.labelKey)}
                            src={item.imageSrc}
                            fill
                            sizes="(min-width: 0) 100vw"
                            className="object-cover object-center size-full shadow-xs"
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
              loading={isSectionPending("theme")}
              disabled={isOrgThemeSubmitting || !isOrgThemeDirty}
              type="submit"
              data-testid="update-org-theme-btn"
            >
              {t("update")}
            </Button>
          </CardFrameFooter>
        </CardFrame>
      </Form>

      <Form
        form={brandColorsFormMethods}
        handleSubmit={(values) => {
          onBrandColorsFormSubmit(values);
        }}
      >
        <CardFrame
          className="has-[[data-slot=collapsible-trigger][data-unchecked]]:before:bg-card before:transition-all"
          render={
            <Collapsible
              open={isCustomBrandColorChecked}
              onOpenChange={handleCustomBrandColorsToggle}
            />
          }
        >
          <CardFrameHeader className="has-[[data-slot=collapsible-trigger][data-unchecked]]:p-6 transition-all">
            <CardFrameTitle>{t("custom_brand_colors")}</CardFrameTitle>
            <CardFrameDescription>
              {t("customize_your_brand_colors")}
            </CardFrameDescription>
            <CardFrameAction>
              <CollapsibleTrigger
                nativeButton={false}
                render={
                  <Switch
                    checked={isCustomBrandColorChecked}
                    aria-label={t("enable_custom_brand_colors")}
                  />
                }
              />
            </CardFrameAction>
          </CardFrameHeader>
          <Card
            render={
              <CollapsiblePanel className="data-ending-style:opacity-0 data-starting-style:opacity-0 transition-[height,opacity]" />
            }
          >
            <CardPanel>
              <div className="flex flex-col gap-4">
                <Controller
                  name="brandColor"
                  control={brandColorsFormMethods.control}
                  defaultValue={
                    currentOrg?.brandColor ?? DEFAULT_LIGHT_BRAND_COLOR
                  }
                  render={() => (
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <Label render={<div />}>{t("light_brand_color")}</Label>
                        <ColorPicker
                          defaultValue={
                            currentOrg?.brandColor ?? DEFAULT_LIGHT_BRAND_COLOR
                          }
                          resetDefaultValue={DEFAULT_LIGHT_BRAND_COLOR}
                          onChange={(value) => {
                            if (checkWCAGContrastColor("#ffffff", value)) {
                              setLightModeError(false);
                            } else {
                              setLightModeError(true);
                            }
                            brandColorsFormMethods.setValue(
                              "brandColor",
                              value,
                              {
                                shouldDirty: true,
                              }
                            );
                          }}
                        />
                      </div>
                      {lightModeError ? (
                        <Alert variant="warning">
                          <TriangleAlertIcon />
                          <AlertDescription>
                            {t("light_theme_contrast_error")}
                          </AlertDescription>
                        </Alert>
                      ) : null}
                    </div>
                  )}
                />

                <Controller
                  name="darkBrandColor"
                  control={brandColorsFormMethods.control}
                  defaultValue={
                    currentOrg?.darkBrandColor ?? DEFAULT_DARK_BRAND_COLOR
                  }
                  render={() => (
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <Label render={<div />}>{t("dark_brand_color")}</Label>
                        <ColorPicker
                          defaultValue={
                            currentOrg?.darkBrandColor ??
                            DEFAULT_DARK_BRAND_COLOR
                          }
                          resetDefaultValue={DEFAULT_DARK_BRAND_COLOR}
                          onChange={(value) => {
                            if (checkWCAGContrastColor("#101010", value)) {
                              setDarkModeError(false);
                            } else {
                              setDarkModeError(true);
                            }
                            brandColorsFormMethods.setValue(
                              "darkBrandColor",
                              value,
                              {
                                shouldDirty: true,
                              }
                            );
                          }}
                        />
                      </div>
                      {darkModeError ? (
                        <Alert variant="warning">
                          <TriangleAlertIcon />
                          <AlertDescription>
                            {t("dark_theme_contrast_error")}
                          </AlertDescription>
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
                  loading={isSectionPending("brandColor")}
                  disabled={
                    isBrandColorsFormSubmitting || !isBrandColorsFormDirty
                  }
                  type="submit"
                >
                  {t("update")}
                </Button>
              </CardFrameFooter>
            </CollapsiblePanel>
          </Collapsible>
        </CardFrame>
      </Form>

      <div className="flex flex-col gap-4">
        <SettingsToggle
          title={t("disable_cal_branding", { appName: APP_NAME })}
          disabled={isSectionPending("hideBranding")}
          description={t("removes_cal_branding", { appName: APP_NAME })}
          checked={hideBrandingValue}
          onCheckedChange={(checked) => {
            setHideBrandingValue(checked);
            mutation.mutate({ hideBranding: checked });
          }}
        />

        <SettingsToggle
          data-testid={`${currentOrg?.id}-seo-indexing-switch`}
          title={t("seo_indexing")}
          description={t("allow_seo_indexing")}
          disabled={isSectionPending("allowSEOIndexing")}
          checked={allowSEOIndexingValue}
          onCheckedChange={(checked) => {
            setAllowSEOIndexingValue(checked);
            mutation.mutate({ allowSEOIndexing: checked });
          }}
        />

        <SettingsToggle
          title={t("disable_org_url_label")}
          description={t("disable_org_url_description", {
            orgSlug: currentOrg?.slug,
            destination: currentOrg?.organizationSettings?.orgAutoAcceptEmail,
          })}
          disabled={isSectionPending("orgProfileRedirectsToVerifiedDomain")}
          checked={orgProfileRedirectsToVerifiedDomainValue}
          onCheckedChange={(checked) => {
            setOrgProfileRedirectsToVerifiedDomainValue(checked);
            mutation.mutate({ orgProfileRedirectsToVerifiedDomain: checked });
          }}
        />
      </div>
    </div>
  );
};

const OrgAppearanceViewWrapper = () => {
  const router = useRouter();
  const {
    data: currentOrg,
    isPending,
    error,
  } = trpc.viewer.organizations.listCurrent.useQuery();

  useEffect(
    function refactorMeWithoutEffect() {
      if (error) {
        router.replace("/enterprise");
      }
    },
    [error]
  );

  if (isPending) {
    return <AppearanceSkeletonLoader />;
  }

  if (!currentOrg) return null;

  return <OrgAppearanceView currentOrg={currentOrg} />;
};

export default OrgAppearanceViewWrapper;
