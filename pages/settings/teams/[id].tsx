import { PlusIcon } from "@heroicons/react/solid";
import { useRouter } from "next/router";
import { useState } from "react";

import SAMLConfiguration from "@ee/components/saml/Configuration";

import { getPlaceholderAvatar } from "@lib/getPlaceholderAvatar";
import { useLocale } from "@lib/hooks/useLocale";
import { trpc } from "@lib/trpc";

import Loader from "@components/Loader";
import Shell from "@components/Shell";
import MemberInvitationModal from "@components/team/MemberInvitationModal";
import MemberList from "@components/team/MemberList";
import TeamSettings from "@components/team/TeamSettings";
import TeamSettingsRightSidebar from "@components/team/TeamSettingsRightSidebar";
import { Alert } from "@components/ui/Alert";
import Avatar from "@components/ui/Avatar";
import { Button } from "@components/ui/Button";

export function TeamSettingsPage() {
  const { t } = useLocale();
  const router = useRouter();

  const [showMemberInvitationModal, setShowMemberInvitationModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { data: team, isLoading } = trpc.useQuery(["viewer.teams.get", { teamId: Number(router.query.id) }], {
    onError: (e) => {
      setErrorMessage(e.message);
    },
  });

  const isAdmin = team && (team.membership.role === "OWNER" || team.membership.role === "ADMIN");

  return (
    <Shell
      backPath={!errorMessage ? `/settings/teams` : undefined}
      heading={team?.name}
      subtitle={team && "Manage this team"}
      HeadingLeftIcon={
        team && (
          <Avatar
            size={12}
            imageSrc={getPlaceholderAvatar(team?.logo, team?.name as string)}
            alt="Team Logo"
            className="mt-1"
          />
        )
      }>
      {!!errorMessage && <Alert className="-mt-24 border" severity="error" title={errorMessage} />}
      {isLoading && <Loader />}
      {team && (
        <>
          <div className="block sm:flex md:max-w-5xl">
            <div className="w-full mr-2 sm:w-9/12">
              <div className="px-4 -mx-0 bg-white border rounded-sm border-neutral-200 sm:px-6">
                {isAdmin ? (
                  <TeamSettings team={team} />
                ) : (
                  <div className="py-5">
                    <span className="mb-1 font-bold">Team Info</span>
                    <p className="text-sm text-gray-700">{team.bio}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mb-3 mt-7">
                <h3 className="text-xl font-bold leading-6 text-gray-900 font-cal">{t("members")}</h3>
                {isAdmin && (
                  <div className="relative flex items-center">
                    <Button
                      type="button"
                      color="secondary"
                      StartIcon={PlusIcon}
                      onClick={() => setShowMemberInvitationModal(true)}>
                      {t("new_member")}
                    </Button>
                  </div>
                )}
              </div>
              <MemberList team={team} members={team.members || []} />
              {isAdmin ? <SAMLConfiguration teamsView={true} teamId={team.id} /> : null}
            </div>
            <div className="w-full px-2 mt-8 ml-2 md:w-3/12 sm:mt-0 min-w-32">
              <TeamSettingsRightSidebar role={team.membership.role} team={team} />
            </div>
          </div>
          {showMemberInvitationModal && (
            <MemberInvitationModal team={team} onExit={() => setShowMemberInvitationModal(false)} />
          )}
        </>
      )}
    </Shell>
  );
}

export default TeamSettingsPage;
