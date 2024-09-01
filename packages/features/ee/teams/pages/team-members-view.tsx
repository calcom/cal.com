"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { MembershipRole } from "@calcom/prisma/enums";
import type { AppCategories } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Meta } from "@calcom/ui";

import { getLayout } from "../../../settings/layouts/SettingsLayout";
import DisableTeamImpersonation from "../components/DisableTeamImpersonation";
import MakeTeamPrivateSwitch from "../components/MakeTeamPrivateSwitch";
import MemberListItem from "../components/MemberListItem";
import TeamInviteList from "../components/TeamInviteList";

export type ConnectedAppsType = {
  name: string | null;
  logo: string | null;
  externalId: string | null;
  app: { slug: string; categories: AppCategories[] } | null;
};

const MembersView = () => {
  const { t } = useLocale();

  const router = useRouter();
  const session = useSession();
  const org = session?.data?.user.org;
  const params = useParamsWithFallback();

  const teamId = Number(params.id);

  const {
    data: team,
    isPending: isTeamsLoading,
    error: teamError,
  } = trpc.viewer.teams.getMinimal.useQuery(
    { teamId },
    {
      enabled: !!teamId,
    }
  );
  useEffect(
    function refactorMeWithoutEffect() {
      if (teamError) {
        router.replace("/teams");
      }
    },
    [teamError]
  );

  const isPending = isTeamsLoading;

  const isInviteOpen = !team?.membership.accepted;

  const isAdmin =
    team && (team.membership.role === MembershipRole.OWNER || team.membership.role === MembershipRole.ADMIN);

  const isOrgAdminOrOwner = org?.role === MembershipRole.OWNER || org?.role === MembershipRole.ADMIN;

  return (
    <>
      <Meta title={t("team_members")} description={t("members_team_description")} CTA={<></>} />
      {!isPending && (
        <>
          <div>
            {team && (
              <>
                {isInviteOpen && (
                  <TeamInviteList
                    teams={[
                      {
                        id: team.id,
                        accepted: team.membership.accepted || false,
                        name: team.name,
                        slug: team.slug,
                        role: team.membership.role,
                      },
                    ]}
                  />
                )}
              </>
            )}

            {((team?.isPrivate && isAdmin) || !team?.isPrivate || isOrgAdminOrOwner) && team && (
              <>
                <MemberListItem team={team} isOrgAdminOrOwner={isOrgAdminOrOwner} />
              </>
            )}

            {team && session.data && (
              <DisableTeamImpersonation
                teamId={team.id}
                memberId={session.data.user.id}
                disabled={isInviteOpen}
              />
            )}

            {team && team.id && (isAdmin || isOrgAdminOrOwner) && (
              <MakeTeamPrivateSwitch
                isOrg={false}
                teamId={team.id}
                isPrivate={team.isPrivate ?? false}
                disabled={isInviteOpen}
              />
            )}
          </div>
        </>
      )}
    </>
  );
};

MembersView.getLayout = getLayout;

export default MembersView;
