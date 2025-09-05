"use client";

import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@calcom/ui/components/sheet";
import { showToast } from "@calcom/ui/components/toast";

import { OrganizationSettingsSheet } from "./OrganizationSettingsSheet";
import { TeamsForm } from "./TeamsForm";

interface TeamEditSheetProps {
  teamId: number;
  open: boolean;
  onClose: () => void;
}

export function TeamEditSheet({ teamId, open, onClose }: TeamEditSheetProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [showOrgSettings, setShowOrgSettings] = useState(false);

  const { data: team, isLoading } = trpc.viewer.admin.teams.get.useQuery({ teamId }, { enabled: open });

  const updateTeamMutation = trpc.viewer.admin.teams.update.useMutation({
    onSuccess: () => {
      showToast(t("team_updated_successfully"), "success");
      utils.viewer.admin.teams.listPaginated.invalidate();
      utils.viewer.admin.teams.get.invalidate({ teamId });
      onClose();
    },
    onError: (error) => {
      showToast(error.message || t("error_updating_team"), "error");
    },
  });

  const handleSubmit = (data: {
    name: string;
    slug: string;
    bio?: string;
    brandColor?: string;
    darkBrandColor?: string;
    bannerUrl?: string;
    timeFormat?: number;
    timeZone?: string;
    weekStart?: string;
  }) => {
    updateTeamMutation.mutate({
      teamId,
      data,
    });
  };

  const getFormDefaultValues = (team: {
    name: string;
    slug: string | null;
    bio: string | null;
    brandColor: string | null;
    darkBrandColor: string | null;
    bannerUrl: string | null;
    timeFormat: number | null;
    timeZone: string | null;
    weekStart: string | null;
  }) => {
    if (!team) return undefined;

    return {
      name: team.name || "",
      slug: team.slug || "",
      bio: team.bio || "",
      brandColor: team.brandColor || "",
      darkBrandColor: team.darkBrandColor || "",
      bannerUrl: team.bannerUrl || "",
      timeFormat: team.timeFormat || undefined,
      timeZone: team.timeZone || "",
      weekStart: team.weekStart || "",
    };
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>{t("edit_team")}</SheetTitle>
            <SheetDescription>{t("edit_team_description")}</SheetDescription>
          </SheetHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-subtle">{t("loading")}</div>
            </div>
          ) : team ? (
            <TeamsForm
              defaultValues={getFormDefaultValues(team)}
              onSubmit={handleSubmit}
              onCancel={onClose}
              isLoading={updateTeamMutation.isPending}
              isOrganization={team.isOrganization}
              onEditOrgSettings={() => setShowOrgSettings(true)}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      {team?.isOrganization && (
        <OrganizationSettingsSheet
          teamId={teamId}
          organizationSettings={team.organizationSettings}
          open={showOrgSettings}
          onClose={() => setShowOrgSettings(false)}
        />
      )}
    </>
  );
}
