"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import { MembershipRole } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Meta } from "@calcom/ui";

import { getLayout } from "../../../settings/layouts/SettingsLayout";
import DisableTeamImpersonation from "../components/DisableTeamImpersonation";
import MakeTeamPrivateSwitch from "../components/MakeTeamPrivateSwitch";
import MemberListItem from "../components/MemberListItem";
import TeamInviteList from "../components/TeamInviteList";

type Team = RouterOutputs["viewer"]["teams"]["get"];

interface MembersListProps {
  team: Team | undefined;
  isOrgAdminOrOwner: boolean | undefined;
  orgMembersNotInThisTeam: RouterOutputs["viewer"]["organizations"]["getMembers"] | undefined;
}

const checkIfExist = (comp: string, query: string) =>
  comp.toLowerCase().replace(/\s+/g, "").includes(query.toLowerCase().replace(/\s+/g, ""));

function MembersList(props: MembersListProps) {
  const { team, isOrgAdminOrOwner, orgMembersNotInThisTeam } = props;
  const [query, setQuery] = useState<string>("");

  const members = team?.members;
  const membersList = members
    ? members && query === ""
      ? members
      : members.filter((member) => {
          const email = member.email ? checkIfExist(member.email, query) : false;
          const username = member.username ? checkIfExist(member.username, query) : false;
          const name = member.name ? checkIfExist(member.name, query) : false;

          return email || username || name;
        })
    : undefined;
  return (
    <div className="flex flex-col gap-y-3">
      {membersList?.length && team ? (
        <MemberListItem
          team={team}
          members={membersList}
          isOrgAdminOrOwner={isOrgAdminOrOwner}
          orgMembersNotInThisTeam={orgMembersNotInThisTeam}
          setQuery={setQuery}
        />
      ) : null}
    </div>
  );
}

const MembersView = () => {
  const searchParams = useCompatSearchParams();
  const { t } = useLocale();

  const router = useRouter();
  const session = useSession();
  const org = session?.data?.user.org;
  const params = useParamsWithFallback();

  const teamId = Number(params.id);

  const { data: orgMembersNotInThisTeam, isPending: isOrgListLoading } =
    trpc.viewer.organizations.getMembers.useQuery(
      {
        teamIdToExclude: teamId,
        distinctUser: true,
      },
      {
        enabled: searchParams !== null && !!teamId,
      }
    );

  const {
    data: team,
    isPending: isTeamsLoading,
    error: teamError,
  } = trpc.viewer.teams.get.useQuery(
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

  const isPending = isOrgListLoading || isTeamsLoading;

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

            {((team?.isPrivate && isAdmin) || !team?.isPrivate || isOrgAdminOrOwner) && (
              <>
                <MembersList
                  team={team}
                  isOrgAdminOrOwner={isOrgAdminOrOwner}
                  orgMembersNotInThisTeam={orgMembersNotInThisTeam}
                />
              </>
            )}

            {team && session.data && (
              <DisableTeamImpersonation
                teamId={team.id}
                memberId={session.data.user.id}
                disabled={isInviteOpen}
              />
            )}

            {team && (isAdmin || isOrgAdminOrOwner) && (
              <MakeTeamPrivateSwitch
                isOrg={false}
                teamId={team.id}
                isPrivate={team.isPrivate}
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
