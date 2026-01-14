"use client";

import { Button } from "@calid/features/ui/components/button";
import ThemeCard from "@calid/features/ui/components/card/theme-card";
import { Form } from "@calid/features/ui/components/form";
import { SettingsSwitch } from "@calid/features/ui/components/switch/settings-switch";
import { triggerToast } from "@calid/features/ui/components/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { revalidateCalIdTeamDataCache } from "@calcom/web/app/(booking-page-wrapper)/team/[slug]/[type]/actions";

import SkeletonLoader from "../components/SkeletonLoader";
import { checkIfMemberAdminorOwner } from "../lib/checkIfMemberAdminorOwner";

const themeFormSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
});

type TeamThemeSetting = {
  theme: "light" | "dark" | "system";
};

interface TeamAppearanceViewProps {
  teamId: number;
}

export default function TeamAppearanceView({ teamId }: TeamAppearanceViewProps) {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();

  // Fetch team data
  const {
    data: team,
    isLoading,
    error,
  } = trpc.viewer.calidTeams.get.useQuery({ teamId }, { enabled: !!teamId });

  const [hideBookATeamMember, setHideBookATeamMember] = useState(team?.hideBookATeamMember ?? false);
  const [hideTeamProfileLink, setHideTeamProfileLink] = useState(team?.hideTeamProfileLink ?? false);

  const themeForm = useForm<TeamThemeSetting>({
    resolver: zodResolver(themeFormSchema),
    defaultValues: {
      theme: (team?.theme as "light" | "dark" | "system") || "system",
    },
  });

  const {
    formState: { isSubmitting: isThemeSubmitting, isDirty: isThemeDirty },
    reset: resetTheme,
  } = themeForm;

  const mutation = trpc.viewer.calidTeams.update.useMutation();

  // Shared update handler
  const updateTeamSetting = async (payload: Record<string, any>, afterUpdate?: (team: any) => void) => {
    try {
      const updatedTeam = await mutation.mutateAsync({ id: teamId, ...payload });
      triggerToast(t("team_settings_updated_successfully"), "success");
      await utils.viewer.teams.get.invalidate();
      if (updatedTeam?.slug) {
        await revalidateCalIdTeamDataCache({
          teamSlug: updatedTeam.slug,
        });
      }
      if (afterUpdate) afterUpdate(updatedTeam);
    } catch (error: any) {
      triggerToast(error.message, "error");
    }
  };

  const onThemeFormSubmit = async ({ theme }: TeamThemeSetting) => {
    await updateTeamSetting({ theme: theme === "system" ? null : theme }, (updatedTeam) => {
      resetTheme({
        theme: (updatedTeam?.theme as "light" | "dark" | null) ?? "system",
      });
    });
  };

  useEffect(() => {
    if (team?.theme) {
      themeForm.reset({
        theme: (team.theme as "light" | "dark" | null) ?? "system",
      });
    }
    // Set initial values for settings switches
    if (team) {
      setHideBookATeamMember(team.hideBookATeamMember ?? false);
      setHideTeamProfileLink(team.hideTeamProfileLink ?? false);
    }
  }, [team, themeForm]);

  if (isLoading) {
    return <SkeletonLoader />;
  }

  if (error || !team) {
    router.push("/teams");
  }

  const isAdminOrOwner = team && checkIfMemberAdminorOwner(team.membership.role);

  return (
    <>
      {isAdminOrOwner ? (
        <div className="flex w-full flex-col space-y-6">
          {/* Theme Form */}
          <div className="border-default space-y-6 rounded-md border p-4">
            <Form form={themeForm} onSubmit={onThemeFormSubmit}>
              <div className="mb-6 flex items-center rounded-md text-sm">
                <div>
                  <p className="text-base font-semibold">{t("team_appearance_theme_title")}</p>
                  <p className="text-default text-xs">{t("team_appearance_theme_description")}</p>
                </div>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <ThemeCard
                  variant="system"
                  value="system"
                  label={t("theme_system")}
                  register={themeForm.register}
                  currentValue={themeForm.watch("theme")}
                />
                <ThemeCard
                  variant="light"
                  value="light"
                  label={t("light")}
                  register={themeForm.register}
                  currentValue={themeForm.watch("theme")}
                />
                <ThemeCard
                  variant="dark"
                  value="dark"
                  label={t("dark")}
                  register={themeForm.register}
                  currentValue={themeForm.watch("theme")}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isThemeSubmitting || !isThemeDirty}
                  loading={isThemeSubmitting}>
                  {t("update")}
                </Button>
              </div>
            </Form>
          </div>

          {/* Toggle switches */}
          <div className="border-default flex flex-col space-y-6 rounded-md border p-4">
            <SettingsSwitch
              toggleSwitchAtTheEnd={true}
              title={t("hide_book_a_team_member")}
              disabled={mutation?.isPending}
              description={t("hide_book_a_team_member_description", { appName: APP_NAME })}
              checked={hideBookATeamMember ?? false}
              onCheckedChange={async (checked) => {
                setHideBookATeamMember(checked);
                await updateTeamSetting({ hideBookATeamMember: checked });
              }}
            />
          </div>

          <div className="border-default flex flex-col space-y-6 rounded-md border p-4">
            <SettingsSwitch
              toggleSwitchAtTheEnd={true}
              title={t("hide_team_profile_link")}
              disabled={mutation?.isPending}
              description={t("hide_team_profile_link_description")}
              checked={hideTeamProfileLink ?? false}
              onCheckedChange={async (checked) => {
                setHideTeamProfileLink(checked);
                await updateTeamSetting({ hideTeamProfileLink: checked });
              }}
            />
          </div>
        </div>
      ) : (
        <div className="border-subtle rounded-md border p-4">
          <span className="text-default text-sm">{t("only_owner_can_change")}</span>
        </div>
      )}
    </>
  );
}
