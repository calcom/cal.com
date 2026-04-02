"use client";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { APP_NAME, DEFAULT_DARK_BRAND_COLOR, DEFAULT_LIGHT_BRAND_COLOR } from "@calcom/lib/constants";
import { checkWCAGContrastColor } from "@calcom/lib/getBrandColours";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { bookingThemePreviewOptions } from "@calcom/lib/theme/themeItems";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { ColorPicker, Form } from "@calcom/ui/components/form";
import { revalidateTeamDataCache } from "@calcom/web/app/(booking-page-wrapper)/team/[slug]/[type]/actions";
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
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { AppearanceSkeletonLoader } from "~/ee/common/components/CommonSkeletonLoaders";

type BrandColorsFormValues = {
  brandColor: string;
  darkBrandColor: string;
};

type ProfileViewProps = { team: RouterOutputs["viewer"]["teams"]["get"] };

const ProfileView = ({ team }: ProfileViewProps) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const [hideBrandingValue, setHideBrandingValue] = useState(team?.hideBranding ?? false);
  const [hideBookATeamMember, setHideBookATeamMember] = useState(team?.hideBookATeamMember ?? false);
  const [hideTeamProfileLink, setHideTeamProfileLink] = useState(team?.hideTeamProfileLink ?? false);
  const [darkModeError, setDarkModeError] = useState(false);
  const [lightModeError, setLightModeError] = useState(false);
  const [isCustomBrandColorChecked, setIsCustomBrandColorChecked] = useState(
    (team?.brandColor ?? DEFAULT_LIGHT_BRAND_COLOR) !== DEFAULT_LIGHT_BRAND_COLOR ||
      (team?.darkBrandColor ?? DEFAULT_DARK_BRAND_COLOR) !== DEFAULT_DARK_BRAND_COLOR
  );

  const themeForm = useForm<{ theme: string | null | undefined }>({
    defaultValues: {
      theme: team?.theme,
    },
  });

  const {
    formState: { isSubmitting: isThemeSubmitting, isDirty: isThemeDirty },
    reset: resetTheme,
  } = themeForm;
  const selectedTheme = themeForm.watch("theme");

  const brandColorsFormMethods = useForm<BrandColorsFormValues>({
    defaultValues: {
      brandColor: team?.brandColor || DEFAULT_LIGHT_BRAND_COLOR,
      darkBrandColor: team?.darkBrandColor || DEFAULT_DARK_BRAND_COLOR,
    },
  });

  const {
    reset: resetBrandColors,
    formState: { isSubmitting: isBrandColorsFormSubmitting, isDirty: isBrandColorsFormDirty },
  } = brandColorsFormMethods;

  const mutation = trpc.viewer.teams.update.useMutation({
    onError: (err) => {
      toastManager.add({ title: err.message, type: "error" });
    },
    async onSuccess(res) {
      await utils.viewer.teams.get.invalidate();
      if (res) {
        resetTheme({ theme: res.theme });
        resetBrandColors({
          brandColor: res.brandColor ?? DEFAULT_LIGHT_BRAND_COLOR,
          darkBrandColor: res.darkBrandColor ?? DEFAULT_DARK_BRAND_COLOR,
        });
      }

      toastManager.add({ title: t("your_team_updated_successfully"), type: "success" });
      if (res?.slug) {
        // Appearance changes (theme, colours, branding toggles) are read on the team booking page through
        // `getCachedTeamData` in `queries.ts`.
        await revalidateTeamDataCache({
          teamSlug: res?.slug,
          orgSlug: team?.parent?.slug ?? null,
        });
      }
    },
  });

  const onBrandColorsFormSubmit = (values: BrandColorsFormValues) => {
    mutation.mutate({ ...values, id: team.id });
  };

  const handleCustomBrandColorsToggle = (checked: boolean) => {
    if (isCustomBrandColorChecked === checked) return;
    setIsCustomBrandColorChecked(checked);
    setLightModeError(false);
    setDarkModeError(false);
    if (!checked) {
      mutation.mutate({
        id: team.id,
        brandColor: DEFAULT_LIGHT_BRAND_COLOR,
        darkBrandColor: DEFAULT_DARK_BRAND_COLOR,
      });
    }
  };

  const isAdmin = team && checkAdminOrOwner(team.membership.role);

  return (
    <>
      {isAdmin ? (
        <div className="flex flex-col gap-4">
          <Form
            form={themeForm}
            handleSubmit={({ theme }) => {
              mutation.mutate({
                id: team.id,
                theme: theme === "light" || theme === "dark" ? theme : null,
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
                        themeForm.setValue("theme", value === "system" ? null : value, { shouldDirty: true });
                      }}>
                      {bookingThemePreviewOptions.map((item) => (
                        <FieldItem className="flex-1" key={item.value}>
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
                  disabled={isThemeSubmitting || !isThemeDirty}
                  type="submit"
                  data-testid="update-org-theme-btn">
                  {t("update")}
                </Button>
              </CardFrameFooter>
            </CardFrame>
          </Form>

          <Form
            form={brandColorsFormMethods}
            handleSubmit={(values) => {
              onBrandColorsFormSubmit(values);
            }}>
            <CardFrame
              className="has-[[data-slot=collapsible-trigger][data-unchecked]]:before:bg-card before:transition-all"
              render={
                <Collapsible open={isCustomBrandColorChecked} onOpenChange={handleCustomBrandColorsToggle} />
              }>
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
              <Card
                render={
                  <CollapsiblePanel className="data-ending-style:opacity-0 data-starting-style:opacity-0 transition-[height,opacity]" />
                }>
                <CardPanel>
                  <div className="flex flex-col gap-4">
                    <Controller
                      name="brandColor"
                      control={brandColorsFormMethods.control}
                      defaultValue={team?.brandColor ?? DEFAULT_LIGHT_BRAND_COLOR}
                      render={() => (
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-2">
                            <Label render={<div />}>{t("light_brand_color")}</Label>
                            <ColorPicker
                              defaultValue={team?.brandColor ?? DEFAULT_LIGHT_BRAND_COLOR}
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
                      defaultValue={team?.darkBrandColor ?? DEFAULT_DARK_BRAND_COLOR}
                      render={() => (
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-2">
                            <Label render={<div />}>{t("dark_brand_color")}</Label>
                            <ColorPicker
                              defaultValue={team?.darkBrandColor ?? DEFAULT_DARK_BRAND_COLOR}
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

          <div className="flex flex-col gap-4">
            <SettingsToggle
              title={t("disable_cal_branding", { appName: APP_NAME })}
              disabled={mutation?.isPending}
              description={t("removes_cal_branding", { appName: APP_NAME })}
              checked={hideBrandingValue}
              onCheckedChange={(checked) => {
                setHideBrandingValue(checked);
                mutation.mutate({ id: team.id, hideBranding: checked });
              }}
            />

            <SettingsToggle
              title={t("hide_book_a_team_member")}
              disabled={mutation?.isPending}
              description={t("hide_book_a_team_member_description", { appName: APP_NAME })}
              checked={hideBookATeamMember ?? false}
              onCheckedChange={(checked) => {
                setHideBookATeamMember(checked);
                mutation.mutate({ id: team.id, hideBookATeamMember: checked });
              }}
            />

            <SettingsToggle
              title={t("hide_team_profile_link")}
              disabled={mutation?.isPending}
              description={t("hide_team_profile_link_description")}
              checked={hideTeamProfileLink ?? false}
              onCheckedChange={(checked) => {
                setHideTeamProfileLink(checked);
                mutation.mutate({ id: team.id, hideTeamProfileLink: checked });
              }}
            />
          </div>
        </div>
      ) : (
        <div className="border-subtle rounded-md border p-5">
          <span className="text-default text-sm">{t("only_owner_change")}</span>
        </div>
      )}
    </>
  );
};

const ProfileViewWrapper = () => {
  const router = useRouter();
  const params = useParamsWithFallback();

  const { t } = useLocale();

  const {
    data: team,
    isPending,
    error,
  } = trpc.viewer.teams.get.useQuery(
    { teamId: Number(params.id) },
    {
      enabled: !!Number(params.id),
    }
  );

  useEffect(
    function refactorMeWithoutEffect() {
      if (error) {
        router.replace("/teams");
      }
    },
    [error]
  );

  if (isPending) return <AppearanceSkeletonLoader />;

  if (!team) return null;

  return <ProfileView team={team} />;
};

export default ProfileViewWrapper;
