"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";

import BrandColorsForm from "@calcom/features/ee/components/BrandColorsForm";
import { AppearanceSkeletonLoader } from "@calcom/features/ee/components/CommonSkeletonLoaders";
import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { APP_NAME } from "@calcom/lib/constants";
import { DEFAULT_LIGHT_BRAND_COLOR, DEFAULT_DARK_BRAND_COLOR } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Button, Form, showToast, SettingsToggle } from "@calcom/ui";

import ThemeLabel from "../../../settings/ThemeLabel";

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

  const themeForm = useForm<{ theme: string | null | undefined }>({
    defaultValues: {
      theme: team?.theme,
    },
  });

  const {
    formState: { isSubmitting: isThemeSubmitting, isDirty: isThemeDirty },
    reset: resetTheme,
  } = themeForm;

  const brandColorsFormMethods = useForm<BrandColorsFormValues>({
    defaultValues: {
      brandColor: team?.brandColor || DEFAULT_LIGHT_BRAND_COLOR,
      darkBrandColor: team?.darkBrandColor || DEFAULT_DARK_BRAND_COLOR,
    },
  });

  const { reset: resetBrandColors } = brandColorsFormMethods;

  const mutation = trpc.viewer.teams.update.useMutation({
    onError: (err) => {
      showToast(err.message, "error");
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

      showToast(t("your_team_updated_successfully"), "success");
    },
  });

  const onBrandColorsFormSubmit = (values: BrandColorsFormValues) => {
    mutation.mutate({ ...values, id: team.id });
  };

  const isAdmin =
    team && (team.membership.role === MembershipRole.OWNER || team.membership.role === MembershipRole.ADMIN);

  return (
    <>
      {isAdmin ? (
        <>
          <Form
            form={themeForm}
            handleSubmit={({ theme }) => {
              mutation.mutate({
                id: team.id,
                theme: theme === "light" || theme === "dark" ? theme : null,
              });
            }}>
            <div className="border-subtle mt-6 flex items-center rounded-t-xl border p-6 text-sm">
              <div>
                <p className="font-semibold">{t("theme")}</p>
                <p className="text-default">{t("theme_applies_note")}</p>
              </div>
            </div>
            <div className="border-subtle flex flex-col justify-between border-x px-6 py-8 sm:flex-row">
              <ThemeLabel
                variant="system"
                value="system"
                label={t("theme_system")}
                defaultChecked={team.theme === null}
                register={themeForm.register}
              />
              <ThemeLabel
                variant="light"
                value="light"
                label={t("light")}
                defaultChecked={team.theme === "light"}
                register={themeForm.register}
              />
              <ThemeLabel
                variant="dark"
                value="dark"
                label={t("dark")}
                defaultChecked={team.theme === "dark"}
                register={themeForm.register}
              />
            </div>
            <SectionBottomActions className="mb-6" align="end">
              <Button
                disabled={isThemeSubmitting || !isThemeDirty}
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
              brandColor={team?.brandColor ?? DEFAULT_LIGHT_BRAND_COLOR}
              darkBrandColor={team?.darkBrandColor ?? DEFAULT_DARK_BRAND_COLOR}
            />
          </Form>

          <div className="mt-6 flex flex-col gap-6">
            <SettingsToggle
              toggleSwitchAtTheEnd={true}
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
              toggleSwitchAtTheEnd={true}
              title={t("hide_book_a_team_member")}
              disabled={mutation?.isPending}
              description={t("hide_book_a_team_member_description", { appName: APP_NAME })}
              checked={hideBookATeamMember ?? false}
              onCheckedChange={(checked) => {
                setHideBookATeamMember(checked);
                mutation.mutate({ id: team.id, hideBookATeamMember: checked });
              }}
            />
          </div>
        </>
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
