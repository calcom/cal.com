import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import ThemeLabel from "@calcom/features/settings/ThemeLabel";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { classNames } from "@calcom/lib";
import { DEFAULT_LIGHT_BRAND_COLOR, DEFAULT_DARK_BRAND_COLOR } from "@calcom/lib/constants";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  ColorPicker,
  Form,
  Meta,
  showToast,
  SkeletonButton,
  SkeletonContainer,
  SkeletonText,
  SettingsToggle,
  Alert,
} from "@calcom/ui";

const SkeletonLoader = ({ title, description }: { title: string; description: string }) => {
  return (
    <SkeletonContainer>
      <Meta title={title} description={description} borderInShellHeader={false} />
      <div className="border-subtle mt-6 flex items-center rounded-t-xl border p-6 text-sm">
        <SkeletonText className="h-8 w-1/3" />
      </div>
      <div className="border-subtle space-y-6 border-x px-4 py-6 sm:px-6">
        <div className="flex items-center justify-center">
          <SkeletonButton className="mr-6 h-32 w-48 rounded-md p-5" />
          <SkeletonButton className="mr-6 h-32 w-48 rounded-md p-5" />
          <SkeletonButton className="mr-6 h-32 w-48 rounded-md p-5" />
        </div>
        <div className="flex justify-between">
          <SkeletonText className="h-8 w-1/3" />
          <SkeletonText className="h-8 w-1/3" />
        </div>

        <SkeletonText className="h-8 w-full" />
      </div>
      <div className="rounded-b-xl">
        <SectionBottomActions align="end">
          <SkeletonButton className="mr-6 h-8 w-20 rounded-md p-5" />
        </SectionBottomActions>
      </div>
    </SkeletonContainer>
  );
};

const OrgAppearanceView = ({ currentOrg }: { currentOrg: RouterOutputs["organizations"]["listCurrent"] }) => {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const [darkModeError, setDarkModeError] = useState(false);
  const [lightModeError, setLightModeError] = useState(false);

  const themeForm = useForm<{ theme: string | null | undefined }>({
    defaultValues: {
      theme: currentOrg?.theme,
    },
  });

  const {
    formState: { isSubmitting: isOrgThemeSubmitting, isDirty: isOrgThemeDirty },
    reset: resetOrgThemeReset,
  } = themeForm;

  const brandColorsFormMethods = useForm<{ brandColor: string; darkBrandColor: string }>({
    defaultValues: {
      brandColor: currentOrg?.brandColor || DEFAULT_LIGHT_BRAND_COLOR,
      darkBrandColor: currentOrg?.darkBrandColor || DEFAULT_DARK_BRAND_COLOR,
    },
  });

  const {
    formState: { isSubmitting: isBrandColorsFormSubmitting, isDirty: isBrandColorsFormDirty },
    reset: resetBrandColorsThemeReset,
  } = brandColorsFormMethods;

  const [isCustomBrandColorChecked, setIsCustomBrandColorChecked] = useState(
    currentOrg?.brandColor !== DEFAULT_LIGHT_BRAND_COLOR ||
      currentOrg?.darkBrandColor !== DEFAULT_DARK_BRAND_COLOR
  );
  const [hideBrandingValue, setHideBrandingValue] = useState(currentOrg?.hideBranding ?? false);

  const isAdmin =
    currentOrg &&
    (currentOrg.user.role === MembershipRole.OWNER || currentOrg.user.role === MembershipRole.ADMIN);

  const mutation = trpc.viewer.organizations.update.useMutation({
    onError: (err) => {
      showToast(err.message, "error");
    },
    async onSuccess(data) {
      await utils.viewer.teams.get.invalidate();
      showToast(t("your_team_updated_successfully"), "success");
      resetBrandColorsThemeReset({ brandColor: data.brandColor, darkBrandColor: data.darkBrandColor });
      resetOrgThemeReset({ theme: data.theme });
    },
  });

  return (
    <LicenseRequired>
      <Meta
        title={t("appearance")}
        description={t("appearance_team_description")}
        borderInShellHeader={false}
      />
      {isAdmin ? (
        <div>
          <Form
            form={themeForm}
            handleSubmit={(value) => {
              mutation.mutate({
                theme: value.theme || null,
              });
            }}>
            <div className="border-subtle mt-6 flex items-center rounded-t-xl border p-6 text-sm">
              <div>
                <p className="text-default text-base font-semibold">{t("theme")}</p>
                <p className="text-default">{t("theme_applies_note")}</p>
              </div>
            </div>
            <div className="border-subtle flex flex-col justify-between border-x px-6 py-8 sm:flex-row">
              <ThemeLabel
                variant="system"
                value={null}
                label={t("theme_system")}
                defaultChecked={currentOrg.theme === null}
                register={themeForm.register}
              />
              <ThemeLabel
                variant="light"
                value="light"
                label={t("light")}
                defaultChecked={currentOrg.theme === "light"}
                register={themeForm.register}
              />
              <ThemeLabel
                variant="dark"
                value="dark"
                label={t("dark")}
                defaultChecked={currentOrg.theme === "dark"}
                register={themeForm.register}
              />
            </div>
            <SectionBottomActions className="mb-6" align="end">
              <Button
                disabled={isOrgThemeSubmitting || !isOrgThemeDirty}
                type="submit"
                data-testid="update-org-theme-btn"
                color="primary">
                {t("update")}
              </Button>
            </SectionBottomActions>
          </Form>

          <Form
            form={brandColorsFormMethods}
            handleSubmit={(values) => {
              console.log(values);
              mutation.mutate(values);
            }}>
            <div className="mt-6">
              <SettingsToggle
                toggleSwitchAtTheEnd={true}
                title={t("custom_brand_colors")}
                description={t("customize_your_brand_colors")}
                checked={isCustomBrandColorChecked}
                onCheckedChange={(checked) => {
                  setIsCustomBrandColorChecked(checked);
                  if (!checked) {
                    mutation.mutate({
                      brandColor: DEFAULT_LIGHT_BRAND_COLOR,
                      darkBrandColor: DEFAULT_DARK_BRAND_COLOR,
                    });
                  }
                }}
                childrenClassName="lg:ml-0"
                switchContainerClassName={classNames(
                  "py-6 px-4 sm:px-6 border-subtle rounded-xl border",
                  isCustomBrandColorChecked && "rounded-b-none"
                )}>
                <div className="border-subtle flex flex-col gap-6 border-x p-6">
                  <Controller
                    name="brandColor"
                    control={brandColorsFormMethods.control}
                    defaultValue={currentOrg.brandColor}
                    render={() => (
                      <div>
                        <p className="text-default mb-2 block text-sm font-medium">
                          {t("light_brand_color")}
                        </p>
                        <ColorPicker
                          defaultValue={currentOrg.brandColor}
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
                    defaultValue={currentOrg.darkBrandColor}
                    render={() => (
                      <div className="mt-6 sm:mt-0">
                        <p className="text-default mb-2 block text-sm font-medium">{t("dark_brand_color")}</p>
                        <ColorPicker
                          defaultValue={currentOrg.darkBrandColor}
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
                    disabled={isBrandColorsFormSubmitting || !isBrandColorsFormDirty}
                    color="primary"
                    type="submit">
                    {t("update")}
                  </Button>
                </SectionBottomActions>
              </SettingsToggle>
            </div>
          </Form>

          <SettingsToggle
            toggleSwitchAtTheEnd={true}
            title={t("disable_cal_branding", { appName: APP_NAME })}
            disabled={mutation?.isLoading}
            description={t("removes_cal_branding", { appName: APP_NAME })}
            checked={hideBrandingValue}
            onCheckedChange={(checked) => {
              setHideBrandingValue(checked);
              mutation.mutate({ hideBranding: checked });
            }}
            switchContainerClassName="border-subtle mt-6 rounded-xl border py-6 px-4 sm:px-6"
          />
        </div>
      ) : (
        <div className="border-subtle rounded-md border p-5">
          <span className="text-default text-sm">{t("only_owner_change")}</span>
        </div>
      )}
    </LicenseRequired>
  );
};

const OrgAppearanceViewWrapper = () => {
  const router = useRouter();
  const { t } = useLocale();
  const { data: currentOrg, isLoading } = trpc.viewer.organizations.listCurrent.useQuery(undefined, {
    onError: () => {
      router.push("/settings");
    },
  });
  if (isLoading || !currentOrg) {
    return <SkeletonLoader title={t("appearance")} description={t("appearance_team_description")} />;
  }
  return <OrgAppearanceView currentOrg={currentOrg} />;
};

OrgAppearanceViewWrapper.getLayout = getLayout;

export default OrgAppearanceViewWrapper;
