"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import BrandColorsForm from "@calcom/features/ee/components/BrandColorsForm";
import { AppearanceSkeletonLoader } from "@calcom/features/ee/components/CommonSkeletonLoaders";
import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import ThemeLabel from "@calcom/features/settings/ThemeLabel";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { DEFAULT_LIGHT_BRAND_COLOR, DEFAULT_DARK_BRAND_COLOR } from "@calcom/lib/constants";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Button, Form, Meta, showToast, SettingsToggle, Avatar, ImageUploader } from "@calcom/ui";
import { Icon } from "@calcom/ui";

type BrandColorsFormValues = {
  brandColor: string;
  darkBrandColor: string;
};

const OrgAppearanceView = ({
  currentOrg,
  isAdminOrOwner,
}: {
  currentOrg: RouterOutputs["viewer"]["organizations"]["listCurrent"];
  isAdminOrOwner: boolean;
}) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const themeForm = useForm<{ theme: string | null | undefined }>({
    defaultValues: {
      theme: currentOrg?.theme,
    },
  });

  const {
    formState: { isSubmitting: isOrgThemeSubmitting, isDirty: isOrgThemeDirty },
    reset: resetOrgThemeReset,
  } = themeForm;

  const [hideBrandingValue, setHideBrandingValue] = useState(currentOrg?.hideBranding ?? false);

  const brandColorsFormMethods = useForm<BrandColorsFormValues>({
    defaultValues: {
      brandColor: currentOrg?.brandColor || DEFAULT_LIGHT_BRAND_COLOR,
      darkBrandColor: currentOrg?.darkBrandColor || DEFAULT_DARK_BRAND_COLOR,
    },
  });

  const mutation = trpc.viewer.organizations.update.useMutation({
    onError: (err) => {
      showToast(err.message, "error");
    },
    async onSuccess(res) {
      await utils.viewer.teams.get.invalidate();
      await utils.viewer.organizations.listCurrent.invalidate();

      showToast(t("your_team_updated_successfully"), "success");
      if (res) {
        brandColorsFormMethods.reset({
          brandColor: res.data.brandColor as string,
          darkBrandColor: res.data.darkBrandColor as string,
        });
        resetOrgThemeReset({ theme: res.data.theme as string | undefined });
      }
    },
  });

  const onBrandColorsFormSubmit = (values: BrandColorsFormValues) => {
    mutation.mutate(values);
  };

  return (
    <LicenseRequired>
      <Meta
        title={t("appearance")}
        description={t("appearance_org_description")}
        borderInShellHeader={false}
      />
      {isAdminOrOwner ? (
        <div>
          <div className="my-6">
            <div className="flex items-center text-sm">
              <Avatar
                alt="calVideoLogo"
                imageSrc={currentOrg?.calVideoLogo}
                fallback={<Icon name="plus" className="text-subtle h-6 w-6" />}
                size="lg"
              />
              <div className="ms-4">
                <div className="flex gap-2">
                  <ImageUploader
                    target="avatar"
                    id="cal-video-logo-upload"
                    buttonMsg={
                      currentOrg?.calVideoLogo ? t("update_cal_video_logo") : t("upload_cal_video_logo")
                    }
                    handleAvatarChange={(newLogo) => {
                      mutation.mutate({
                        calVideoLogo: newLogo,
                      });
                    }}
                    disabled={mutation.isPending}
                    imageSrc={currentOrg?.calVideoLogo ?? undefined}
                    uploadInstruction={t("cal_video_logo_upload_instruction")}
                    triggerButtonColor={currentOrg?.calVideoLogo ? "secondary" : "primary"}
                  />
                  {currentOrg?.calVideoLogo && (
                    <Button
                      color="destructive"
                      disabled={mutation.isPending}
                      onClick={() => {
                        mutation.mutate({
                          calVideoLogo: null,
                        });
                      }}>
                      {t("remove")}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <Form
            form={themeForm}
            handleSubmit={(value) => {
              mutation.mutate({
                theme: value.theme ?? null,
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
                value={undefined}
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
              onBrandColorsFormSubmit(values);
            }}>
            <BrandColorsForm
              onSubmit={onBrandColorsFormSubmit}
              brandColor={currentOrg?.brandColor ?? DEFAULT_LIGHT_BRAND_COLOR}
              darkBrandColor={currentOrg?.darkBrandColor ?? DEFAULT_DARK_BRAND_COLOR}
            />
          </Form>

          <SettingsToggle
            toggleSwitchAtTheEnd={true}
            title={t("disable_cal_branding", { appName: APP_NAME })}
            disabled={mutation?.isPending}
            description={t("removes_cal_branding", { appName: APP_NAME })}
            checked={hideBrandingValue}
            onCheckedChange={(checked) => {
              setHideBrandingValue(checked);
              mutation.mutate({ hideBranding: checked });
            }}
            switchContainerClassName="mt-6"
          />
        </div>
      ) : (
        <div className="py-5">
          <span className="text-default text-sm">{t("only_owner_change")}</span>
        </div>
      )}
    </LicenseRequired>
  );
};

const OrgAppearanceViewWrapper = () => {
  const router = useRouter();
  const { t } = useLocale();
  const session = useSession();
  const orgRole = session?.data?.user?.org?.role;
  const { data: currentOrg, isPending, error } = trpc.viewer.organizations.listCurrent.useQuery();

  useEffect(
    function refactorMeWithoutEffect() {
      if (error) {
        router.push("/settings");
      }
    },
    [error]
  );

  if (isPending) {
    return <AppearanceSkeletonLoader title={t("appearance")} description={t("appearance_org_description")} />;
  }

  if (!currentOrg) return null;

  const isAdminOrOwner = orgRole === MembershipRole.OWNER || orgRole === MembershipRole.ADMIN;

  return <OrgAppearanceView currentOrg={currentOrg} isAdminOrOwner={isAdminOrOwner} />;
};

OrgAppearanceViewWrapper.getLayout = getLayout;

export default OrgAppearanceViewWrapper;
