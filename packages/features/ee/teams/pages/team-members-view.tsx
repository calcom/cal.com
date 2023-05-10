import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useState, Fragment, useTransition } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Button, Meta, SkeletonLoader, TextField, showToast } from "@calcom/ui";
import { Plus } from "@calcom/ui/components/icon";

import { useInViewObserver } from "@lib/hooks/useInViewObserver";

import { getLayout } from "../../../settings/layouts/SettingsLayout";
import DisableTeamImpersonation from "../components/DisableTeamImpersonation";
import MemberInvitationModal from "../components/MemberInvitationModal";
import MemberListItem from "../components/MemberListItem";
import TeamInviteList from "../components/TeamInviteList";

type Team = RouterOutputs["viewer"]["teams"]["get"];

interface MembersListProps {
  team: Team | undefined;
  teamId: number;
}

function MembersList(props: MembersListProps) {
  const { team, teamId } = props;
  const { t } = useLocale();
  const [query, setQuery] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const { data, isFetching, hasNextPage, status, fetchNextPage, isFetchingNextPage, isPaused } =
    trpc.viewer.teams.search.useInfiniteQuery(
      {
        teamId,
        limit: 7,
        search: query,
      },
      {
        enabled: !isNaN(teamId) && typeof teamId === "number",
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    );

  const buttonInView = useInViewObserver(() => {
    if (!isFetching && hasNextPage && status === "success") {
      fetchNextPage();
    }
  });
  const isEmpty = !data?.pages[0]?.members.length;

  return (
    <div className="flex flex-col gap-y-3">
      <TextField
        type="search"
        autoComplete="false"
        onChange={(e) =>
          startTransition(() => {
            setQuery(e.target.value);
          })
        }
        value={query}
        defaultValue=""
        placeholder={`${t("search")}...`}
      />

      {(status === "loading" || isPaused) && <SkeletonLoader />}

      {!isEmpty && team ? (
        <ul className="divide-subtle border-subtle divide-y rounded-md border ">
          {data.pages.map((group, i) => (
            <Fragment key={i}>
              {group.members.map((member) => {
                return <MemberListItem key={member.id} team={team} member={member} />;
              })}
            </Fragment>
          ))}
        </ul>
      ) : null}
      <div className="flex items-center justify-center" ref={buttonInView}>
        <Button
          color="minimal"
          loading={isFetchingNextPage || isPending}
          disabled={!hasNextPage}
          onClick={() => fetchNextPage()}>
          {hasNextPage ? t("load_more_results") : t("no_more_results")}
        </Button>
      </div>
    </div>
  );
}

const MembersView = () => {
  const { t, i18n } = useLocale();
  const router = useRouter();
  const session = useSession();
  const utils = trpc.useContext();
  const [showMemberInvitationModal, setShowMemberInvitationModal] = useState(false);
  const teamId = Number(router.query.id);

  const { data: team, isLoading } = trpc.viewer.teams.get.useQuery(
    { teamId },
    {
      enabled: !isNaN(teamId) && typeof teamId === "number",
      onError: () => {
        router.push("/settings");
      },
    }
  );

  const inviteMemberMutation = trpc.viewer.teams.inviteMember.useMutation({
    async onSuccess(data) {
      await utils.viewer.teams.get.invalidate();
      setShowMemberInvitationModal(false);
      if (data.sendEmailInvitation) {
        showToast(
          t("email_invite_team", {
            email: data.usernameOrEmail,
          }),
          "success"
        );
      }
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const isInviteOpen = !team?.membership.accepted;

  const isAdmin =
    team && (team.membership.role === MembershipRole.OWNER || team.membership.role === MembershipRole.ADMIN);

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
              onClick={() => setShowMemberInvitationModal(true)}
              data-testid="new-member-button">
              {t("add")}
            </Button>
          ) : null
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
                        accepted: team.membership.accepted || false,
                        logo: team.logo,
                        name: team.name,
                        slug: team.slug,
                        role: team.membership.role,
                      },
                    ]}
                  />
                )}
              </>
            )}
            <MembersList teamId={teamId} team={team} />
            <hr className="border-subtle my-8" />

            {team && session.data && (
              <DisableTeamImpersonation
                teamId={team.id}
                memberId={session.data.user.id}
                disabled={isInviteOpen}
              />
            )}
            <hr className="border-subtle my-8" />
          </div>
          {showMemberInvitationModal && team && (
            <MemberInvitationModal
              isOpen={showMemberInvitationModal}
              members={team.members}
              onExit={() => setShowMemberInvitationModal(false)}
              onSubmit={(values) => {
                inviteMemberMutation.mutate({
                  teamId,
                  language: i18n.language,
                  role: values.role,
                  usernameOrEmail: values.emailOrUsername,
                  sendEmailInvitation: values.sendInviteEmail,
                });
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
