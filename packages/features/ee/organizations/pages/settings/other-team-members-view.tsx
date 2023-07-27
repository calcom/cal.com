import { useRouter } from "next/router";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Button, Meta, TextField } from "@calcom/ui";
import { Plus } from "@calcom/ui/components/icon";

import { getLayout } from "../../../../settings/layouts/SettingsLayout";
// import DisableTeamImpersonation from "../components/DisableTeamImpersonation";
// import InviteLinkSettingsModal from "../components/InviteLinkSettingsModal";
import MakeTeamPrivateSwitch from "../../../teams/components/MakeTeamPrivateSwitch";
import TeamInviteList from "../../../teams/components/TeamInviteList";
import MemberListItem from "../components/MemberListItem";

type Members = RouterOutputs["viewer"]["organizations"]["listOtherTeamMembers"];
type Team = RouterOutputs["viewer"]["organizations"]["getOtherTeam"];

interface MembersListProps {
  members: Members | undefined;
  team: Team | undefined;
}

function MembersList(props: MembersListProps) {
  const { t } = useLocale();
  const [query, setQuery] = useState<string>("");

  const { members, team } = props;
  console.log({ members });
  return (
    <div className="flex flex-col gap-y-3">
      <TextField
        type="search"
        autoComplete="false"
        onChange={(e) => setQuery(e.target.value)}
        value={query}
        placeholder={`${t("search")}...`}
      />
      {members?.length && team ? (
        <ul className="divide-subtle border-subtle divide-y rounded-md border ">
          {members.map((member) => {
            return <MemberListItem key={member.id} member={member} />;
          })}
        </ul>
      ) : null}
    </div>
  );
}

const MembersView = () => {
  const { t } = useLocale();

  const router = useRouter();

  const teamId = Number(router.query.id);
  console.log({ teamId });
  const { data: team, isLoading: isTeamLoading } = trpc.viewer.organizations.getOtherTeam.useQuery(
    { teamId },
    {
      onError: () => {
        router.push("/settings");
      },
    }
  );
  const { data: members, isLoading: isLoadingMembers } =
    trpc.viewer.organizations.listOtherTeamMembers.useQuery(
      { teamId },
      {
        onError: () => {
          router.push("/settings");
        },
      }
    );

  const isLoading = isTeamLoading || isLoadingMembers;

  const isInviteOpen = false;

  const isAdmin = true;

  return (
    <>
      <Meta
        title={t("team_members")}
        description={t("members_team_description")}
        CTA={
          isAdmin ? (
            <Button
              type="button"
              color="primary"
              StartIcon={Plus}
              className="ml-auto"
              // onClick={() => setShowMemberInvitationModal(true)}
              data-testid="new-member-button">
              {t("add")}
            </Button>
          ) : (
            <></>
          )
        }
      />
      {!isLoading && (
        <>
          <div>
            {team && (
              <>
                {isInviteOpen && (
                  <TeamInviteList
                    teams={[
                      {
                        id: team.id,
                        accepted: false,
                        logo: team.logo,
                        name: team.name,
                        slug: team.slug,
                        role: "MEMBER",
                      },
                    ]}
                  />
                )}
              </>
            )}

            {((team?.isPrivate && isAdmin) || !team?.isPrivate) && (
              <>
                <MembersList members={members} team={team} />
                <hr className="border-subtle my-8" />
              </>
            )}

            {team && (
              <>
                <hr className="border-subtle my-8" />
                <MakeTeamPrivateSwitch teamId={team.id} isPrivate={team.isPrivate} disabled={isInviteOpen} />
              </>
            )}
          </div>
        </>
      )}
    </>
  );
};

MembersView.getLayout = getLayout;

export default MembersView;
