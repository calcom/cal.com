"use client";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { Label } from "@calcom/ui/components/form";
import { InfoIcon } from "@coss/ui/icons";
import { showToast } from "@calcom/ui/components/toast";
import { useHasTeamPlan } from "@calcom/web/modules/billing/hooks/useHasPaidPlan";
import { FullscreenUpgradeBannerForTeamsPage } from "@calcom/web/modules/billing/upgrade-banners/FullscreenUpgradeBannerForTeamsPage";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import SkeletonLoaderTeamList from "~/ee/teams/components/SkeletonloaderTeamList";
import TeamList from "./TeamList";

type TeamsListingProps = {
  invitationAccepted: boolean;
  orgId: number | null;
  permissions: {
    canCreateTeam: boolean;
  };
  teams: RouterOutputs["viewer"]["teams"]["list"];
  teamNameFromInvite: string | null;
  errorMsgFromInvite: string | null;
};

export function TeamsListing({
  invitationAccepted,
  orgId,
  permissions,
  teams: data,
  teamNameFromInvite,
  errorMsgFromInvite,
}: TeamsListingProps) {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");
  const { t } = useLocale();
  const router = useRouter();

  const teams = useMemo(() => data?.filter((m) => m.accepted && !m.isOrganization) || [], [data]);

  const teamInvites = useMemo(() => data?.filter((m) => !m.accepted && !m.isOrganization) || [], [data]);

  const organizationInvites = (data?.filter((m) => !m.accepted && m.isOrganization) || []).filter(
    (orgInvite) => {
      const isThereASubTeamOfTheOrganizationInInvites = teamInvites.find(
        (teamInvite) => teamInvite.parentId === orgInvite.id
      );
      // Accepting a subteam invite automatically accepts the invite for the parent organization. So, need to show such an organization's invite
      return !isThereASubTeamOfTheOrganizationInInvites;
    }
  );

  const isCreateTeamButtonDisabled = !!(orgId && !permissions.canCreateTeam);

  const { isPending: isPendingTeamPlan } = useHasTeamPlan();

  useEffect(() => {
    if (!token) {
      return;
    }

    if (errorMsgFromInvite) {
      showToast(errorMsgFromInvite, "error");
      return;
    }

    if (invitationAccepted) {
      showToast(t("successfully_joined"), "success");
      return;
    }

    if (teamNameFromInvite) {
      showToast(t("team_invite_received", { teamName: teamNameFromInvite }), "success");
      return;
    }
  }, [errorMsgFromInvite, invitationAccepted, t, teamNameFromInvite, token]);

  return (
    <>
      {organizationInvites.length > 0 && (
        <div className="mb-6 rounded-md bg-subtle p-5">
          <Label className="pb-2 font-semibold text-emphasis">{t("pending_organization_invites")}</Label>
          <TeamList orgId={orgId} teams={organizationInvites} pending />
        </div>
      )}

      {teamInvites.length > 0 && (
        <div className="mb-6 rounded-md bg-subtle p-5">
          <Label className="pb-2 font-semibold text-emphasis">{t("pending_invites")}</Label>
          <TeamList orgId={orgId} teams={teamInvites} pending />
        </div>
      )}

      {teams.length > 0 && <TeamList orgId={orgId} teams={teams} />}

      {teams.length === 0 && isPendingTeamPlan && <SkeletonLoaderTeamList />}

      {teams.length === 0 && !isPendingTeamPlan && <FullscreenUpgradeBannerForTeamsPage />}

      {/* Only show tip when not showing the upgrade banner */}
      {teams.length > 0 && (
        <p className="mt-4 mb-8 flex w-full items-center gap-1 text-sm text-subtle md:justify-center md:text-center">
          <InfoIcon className="hidden sm:block" /> {t("tip_username_plus")}
        </p>
      )}
    </>
  );
}
