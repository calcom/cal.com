"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import BrandColorsForm from "./BrandColorsForm";
import { AppearanceSkeletonLoader } from "./AppearanceSkeletonLoader";
import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import ThemeLabel from "@calcom/features/settings/ThemeLabel";
import { APP_NAME } from "@calcom/lib/constants";
import { DEFAULT_LIGHT_BRAND_COLOR, DEFAULT_DARK_BRAND_COLOR } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Button } from "@calid/features/ui";
import { Form } from "@calcom/ui/components/form";
import { SettingsToggle } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { revalidateTeamDataCache } from "@calcom/web/app/(booking-page-wrapper)/team/[slug]/[type]/actions";

interface ColorConfigurationModel {
  brandColor: string;
  darkBrandColor: string;
}

interface ProfileViewProps {
  team: RouterOutputs["viewer"]["teams"]["get"];
}

const useTeamMutationHandler = (team: RouterOutputs["viewer"]["teams"]["get"], translationFn: any) => {
  const utilityMethods = trpc.useUtils();

  const mutationHandler = trpc.viewer.teams.update.useMutation({
    onError: (errorData) => {
      showToast(errorData.message, "error");
    },
    async onSuccess(responseData) {
      await utilityMethods.viewer.teams.get.invalidate();

      showToast(translationFn("your_team_updated_successfully"), "success");

      if (responseData?.slug) {
        await revalidateTeamDataCache({
          teamSlug: responseData.slug,
          orgSlug: team?.parent?.slug ?? null,
        });
      }

      return responseData;
    },
  });

  return mutationHandler;
};

const ThemeConfigurationSection = ({
  team,
  updateHandler,
  translationFn,
}: {
  team: RouterOutputs["viewer"]["teams"]["get"];
  updateHandler: any;
  translationFn: any;
}) => {
  const themeConfigurationForm = useForm<{ theme: string | null | undefined }>({
    defaultValues: {
      theme: team?.theme,
    },
  });

  const {
    formState: { isSubmitting: isThemeProcessing, isDirty: hasThemeChanges },
    reset: resetThemeConfiguration,
  } = themeConfigurationForm;

  const handleThemeSubmission = ({ theme }: { theme: string | null | undefined }) => {
    updateHandler.mutate({
      id: team.id,
      theme: theme === "light" || theme === "dark" ? theme : null,
    });
  };

  useEffect(() => {
    if (updateHandler.isSuccess && updateHandler.data) {
      resetThemeConfiguration({ theme: updateHandler.data.theme });
    }
  }, [updateHandler.isSuccess, updateHandler.data, resetThemeConfiguration]);

  return (
    <div className="border-subtle rounded-lg border p-6">
      <Form form={themeConfigurationForm} handleSubmit={handleThemeSubmission}>
        <div className="flex items-center text-sm">
          <div>
            <p className="mt-0.5 text-base font-semibold leading-none">{translationFn("theme")}</p>
            <p className="text-default text-sm leading-normal">{translationFn("theme_applies_note")}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col justify-between sm:flex-row">
          <ThemeLabel
            variant="system"
            value="system"
            label={translationFn("theme_system")}
            defaultChecked={team.theme === null}
            register={themeConfigurationForm.register}
          />
          <ThemeLabel
            variant="light"
            value="light"
            label={translationFn("light")}
            defaultChecked={team.theme === "light"}
            register={themeConfigurationForm.register}
          />
          <ThemeLabel
            variant="dark"
            value="dark"
            label={translationFn("dark")}
            defaultChecked={team.theme === "dark"}
            register={themeConfigurationForm.register}
          />
        </div>
        <Button
          disabled={isThemeProcessing || !hasThemeChanges}
          type="submit"
          className="mt-4"
          data-testid="update-org-theme-btn"
          color="primary">
          {translationFn("update")}
        </Button>
      </Form>
    </div>
  );
};

const ColorSchemeConfigurationSection = ({
  team,
  updateHandler,
}: {
  team: RouterOutputs["viewer"]["teams"]["get"];
  updateHandler: any;
}) => {
  const brandColorsFormMethods = useForm<ColorConfigurationModel>({
    defaultValues: {
      brandColor: team?.brandColor || DEFAULT_LIGHT_BRAND_COLOR,
      darkBrandColor: team?.darkBrandColor || DEFAULT_DARK_BRAND_COLOR,
    },
  });

  const { reset: resetColorConfiguration } = brandColorsFormMethods;

  const processColorSubmission = (colorValues: ColorConfigurationModel) => {
    updateHandler.mutate({ ...colorValues, id: team.id });
  };

  useEffect(() => {
    if (updateHandler.isSuccess && updateHandler.data) {
      resetColorConfiguration({
        brandColor: updateHandler.data.brandColor ?? DEFAULT_LIGHT_BRAND_COLOR,
        darkBrandColor: updateHandler.data.darkBrandColor ?? DEFAULT_DARK_BRAND_COLOR,
      });
    }
  }, [updateHandler.isSuccess, updateHandler.data, resetColorConfiguration]);

  return (
    <Form form={brandColorsFormMethods} handleSubmit={processColorSubmission}>
      <BrandColorsForm
        onSubmit={processColorSubmission}
        brandColor={team?.brandColor ?? DEFAULT_LIGHT_BRAND_COLOR}
        darkBrandColor={team?.darkBrandColor ?? DEFAULT_DARK_BRAND_COLOR}
      />
    </Form>
  );
};

const TeamSettingsToggles = ({
  team,
  updateHandler,
  translationFn,
}: {
  team: RouterOutputs["viewer"]["teams"]["get"];
  updateHandler: any;
  translationFn: any;
}) => {
  const [brandingVisibility, setBrandingVisibility] = useState(team?.hideBranding ?? false);
  const [memberBookingVisibility, setMemberBookingVisibility] = useState(team?.hideBookATeamMember ?? false);
  const [profileLinkVisibility, setProfileLinkVisibility] = useState(team?.hideTeamProfileLink ?? false);

  const handleBrandingToggle = (toggleState: boolean) => {
    setBrandingVisibility(toggleState);
    updateHandler.mutate({ id: team.id, hideBranding: toggleState });
  };

  const handleMemberBookingToggle = (toggleState: boolean) => {
    setMemberBookingVisibility(toggleState);
    updateHandler.mutate({ id: team.id, hideBookATeamMember: toggleState });
  };

  const handleProfileLinkToggle = (toggleState: boolean) => {
    setProfileLinkVisibility(toggleState);
    updateHandler.mutate({ id: team.id, hideTeamProfileLink: toggleState });
  };

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="border-subtle flex rounded-lg border p-6">
        <SettingsToggle
          toggleSwitchAtTheEnd={true}
          title={translationFn("disable_cal_branding", { appName: APP_NAME })}
          disabled={updateHandler?.isPending}
          description={translationFn("removes_cal_branding", { appName: APP_NAME })}
          checked={brandingVisibility}
          onCheckedChange={handleBrandingToggle}
        />
      </div>
      <div className="border-subtle flex rounded-lg border p-6">
        <SettingsToggle
          toggleSwitchAtTheEnd={true}
          title={translationFn("hide_book_a_team_member")}
          disabled={updateHandler?.isPending}
          description={translationFn("hide_book_a_team_member_description", { appName: APP_NAME })}
          checked={memberBookingVisibility ?? false}
          onCheckedChange={handleMemberBookingToggle}
        />
      </div>
      <div className="border-subtle flex rounded-lg border p-6">
        <SettingsToggle
          toggleSwitchAtTheEnd={true}
          title={translationFn("hide_team_profile_link")}
          disabled={updateHandler?.isPending}
          description={translationFn("hide_team_profile_link_description")}
          checked={profileLinkVisibility ?? false}
          onCheckedChange={handleProfileLinkToggle}
        />
      </div>
    </div>
  );
};

const ProfileView = ({ team }: ProfileViewProps) => {
  const { t } = useLocale();
  const updateHandler = useTeamMutationHandler(team, t);
  const hasAdministrativePrivileges = team && checkAdminOrOwner(team.membership.role);

  if (!hasAdministrativePrivileges) {
    return (
      <div className="border-subtle rounded-md border p-5">
        <span className="text-default text-sm">{t("only_owner_change")}</span>
      </div>
    );
  }

  return (
    <>
      <ThemeConfigurationSection team={team} updateHandler={updateHandler} translationFn={t} />
      <ColorSchemeConfigurationSection team={team} updateHandler={updateHandler} />
      <TeamSettingsToggles team={team} updateHandler={updateHandler} translationFn={t} />
    </>
  );
};

const ProfileViewWrapper = () => {
  const navigationRouter = useRouter();
  const routeParameters = useParamsWithFallback();
  const { t } = useLocale();

  const teamId = Number(routeParameters.id);

  const {
    data: team,
    isPending: isDataFetching,
    error: fetchError,
  } = trpc.viewer.teams.get.useQuery(
    { teamId: teamId },
    {
      enabled: Boolean(teamId),
    }
  );

  useEffect(() => {
    if (fetchError) {
      navigationRouter.replace("/teams");
    }
  }, [fetchError, navigationRouter]);

  if (isDataFetching) {
    return <AppearanceSkeletonLoader />;
  }

  if (!team) {
    return null;
  }

  return <ProfileView team={team} />;
};

export default ProfileViewWrapper;
