// import { debounce } from "lodash";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import MemberInvitationModal from "@calcom/ee/teams/components/MemberInvitationModal";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Meta, showToast, Button } from "@calcom/ui";
import { Plus } from "@calcom/ui/components/icon";

import { getLayout } from "../../../../settings/layouts/SettingsLayout";
import MakeTeamPrivateSwitch from "../../../teams/components/MakeTeamPrivateSwitch";
import MemberListItem from "../components/MemberListItem";

type Members = RouterOutputs["viewer"]["organizations"]["listOtherTeamMembers"];
type Team = RouterOutputs["viewer"]["organizations"]["getOtherTeam"];

interface MembersListProps {
  members: Members | undefined;
  team: Team | undefined;
  offset: number;
  setOffset: (offset: number) => void;
  displayLoadMore: boolean;
}

function MembersList(props: MembersListProps) {
  const { t } = useLocale();
  const { displayLoadMore, members, team } = props;
  return (
    <div className="flex flex-col gap-y-3">
      {members?.length && team ? (
        <ul className="divide-subtle border-subtle divide-y rounded-md border ">
          {members.map((member) => {
            return <MemberListItem key={member.id} member={member} />;
          })}
        </ul>
      ) : null}
      {members?.length === 0 && (
        <div className="flex flex-col items-center justify-center">
          <p className="text-default text-sm font-bold">{t("no_members_found")}</p>
        </div>
      )}
      {displayLoadMore && (
        <button
          className="text-primary-500 hover:text-primary-600"
          onClick={() => props.setOffset(props.offset + 1)}>
          {t("load_more")}
        </button>
      )}
    </div>
  );
}

const MembersView = () => {
  const { t, i18n } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId = Number(searchParams.get("id"));
  const session = useSession();
  const utils = trpc.useContext();
  const [offset, setOffset] = useState<number>(1);
  // const [query, setQuery] = useState<string | undefined>("");
  // const [queryToFetch, setQueryToFetch] = useState<string | undefined>("");
  const [loadMore, setLoadMore] = useState<boolean>(true);
  const limit = 100;
  const [showMemberInvitationModal, setShowMemberInvitationModal] = useState<boolean>(false);
  const [members, setMembers] = useState<Members>([]);
  const { data: currentOrg } = trpc.viewer.organizations.listCurrent.useQuery(undefined, {
    enabled: !!session.data?.user?.org,
  });
  const { data: team, isLoading: isTeamLoading } = trpc.viewer.organizations.getOtherTeam.useQuery(
    { teamId },
    {
      onError: () => {
        router.push("/settings");
      },
    }
  );
  const { data: orgMembersNotInThisTeam, isLoading: isOrgListLoading } =
    trpc.viewer.organizations.getMembers.useQuery(
      {
        teamIdToExclude: teamId,
        distinctUser: true,
      },
      {
        enabled: searchParams !== null,
      }
    );
  const { data: membersFetch, isLoading: isLoadingMembers } =
    trpc.viewer.organizations.listOtherTeamMembers.useQuery(
      { teamId, limit, offset: (offset - 1) * limit },
      {
        onError: () => {
          router.push("/settings");
        },
      }
    );

  useEffect(() => {
    if (membersFetch) {
      if (membersFetch.length < limit) {
        setLoadMore(false);
      } else {
        setLoadMore(true);
      }
      setMembers(members.concat(membersFetch));
    }
  }, [membersFetch]);

  const isLoading = isTeamLoading || isLoadingMembers || isOrgListLoading;

  const inviteMemberMutation = trpc.viewer.teams.inviteMember.useMutation({
    onSuccess: () => {
      utils.viewer.organizations.listOtherTeams.invalidate();
      utils.viewer.teams.list.invalidate();
      utils.viewer.organizations.listOtherTeamMembers.invalidate();
    },
  });

  const isOrgAdminOrOwner =
    currentOrg &&
    (currentOrg.user.role === MembershipRole.OWNER || currentOrg.user.role === MembershipRole.ADMIN);

  return (
    <>
      <Meta
        title={t("team_members")}
        description={t("members_team_description")}
        CTA={
          isOrgAdminOrOwner ? (
            <Button
              type="button"
              color="primary"
              StartIcon={Plus}
              className="ml-auto"
              onClick={() => setShowMemberInvitationModal(true)}
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
            <>
              {/* Currently failing due to re render and loose focus */}
              {/* <TextField
                type="search"
                autoComplete="false"
                onChange={(e) => {
                  setQuery(e.target.value);
                  debouncedFunction(e.target.value);
                }}
                value={query}
                placeholder={`${t("search")}...`}
              /> */}
              <MembersList
                members={members}
                team={team}
                setOffset={setOffset}
                offset={offset}
                displayLoadMore={loadMore}
              />
            </>

            {team && (
              <>
                <hr className="border-subtle my-8" />
                <MakeTeamPrivateSwitch teamId={team.id} isPrivate={team.isPrivate} disabled={false} />
              </>
            )}
          </div>
          {showMemberInvitationModal && team && (
            <MemberInvitationModal
              isLoading={inviteMemberMutation.isLoading}
              isOpen={showMemberInvitationModal}
              orgMembers={orgMembersNotInThisTeam}
              teamId={team.id}
              disableCopyLink={true}
              onExit={() => setShowMemberInvitationModal(false)}
              onSubmit={(values, resetFields) => {
                inviteMemberMutation.mutate(
                  {
                    teamId,
                    language: i18n.language,
                    role: values.role,
                    usernameOrEmail: values.emailOrUsername,
                    sendEmailInvitation: values.sendInviteEmail,
                  },
                  {
                    onSuccess: async (data) => {
                      await utils.viewer.teams.get.invalidate();
                      setShowMemberInvitationModal(false);
                      if (data.sendEmailInvitation) {
                        if (Array.isArray(data.usernameOrEmail)) {
                          showToast(
                            t("email_invite_team_bulk", {
                              userCount: data.usernameOrEmail.length,
                            }),
                            "success"
                          );
                          resetFields();
                        } else {
                          showToast(
                            t("email_invite_team", {
                              email: data.usernameOrEmail,
                            }),
                            "success"
                          );
                        }
                      }
                    },
                    onError: (error) => {
                      showToast(error.message, "error");
                    },
                  }
                );
              }}
              onSettingsOpen={() => {
                setShowMemberInvitationModal(false);
              }}
            />
          )}
        </>
      )}
    </>
  );
};

MembersView.getLayout = getLayout;

export default MembersView;
