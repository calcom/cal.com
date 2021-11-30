import { PlusIcon } from "@heroicons/react/solid";
// import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import { useState } from "react";

import { getPlaceholderAvatar } from "@lib/getPlaceholderAvatar";
import { useLocale } from "@lib/hooks/useLocale";
import { trpc } from "@lib/trpc";

import Loader from "@components/Loader";
import Shell from "@components/Shell";
import MemberInvitationModal from "@components/team/MemberInvitationModal";
import MemberList from "@components/team/MemberList";
import TeamSettings from "@components/team/TeamSettings";
import TeamSettingsRightSidebar from "@components/team/TeamSettingsRightSidebar";
import Avatar from "@components/ui/Avatar";
import { Button } from "@components/ui/Button";

function useTeamQuery(teamId: number) {
  return trpc.useQuery(["viewer.teams.get", { teamId }]);
}

export function TeamSettingsPage() {
  const { t } = useLocale();
  const router = useRouter();
  const { data: team } = useTeamQuery(Number(router.query.id));
  const [showMemberInvitationModal, setShowMemberInvitationModal] = useState(false);

  return (
    <Shell
      showBackButton
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
      {team ? (
        <>
          <div className="block sm:flex md:max-w-5xl">
            <div className="w-full mr-2 sm:w-9/12">
              <div className="p-2 py-2 -mx-4 bg-white border rounded-sm border-neutral-200 sm:mx-0 sm:px-8">
                <TeamSettings team={team} />
              </div>
              <div className="flex items-center justify-between mb-3 mt-7">
                <h3 className="text-xl font-bold leading-6 text-gray-900 font-cal">{t("members")}</h3>
                <div className="relative flex items-center">
                  <Button
                    type="button"
                    color="secondary"
                    StartIcon={PlusIcon}
                    onClick={() => setShowMemberInvitationModal(true)}>
                    {t("new_member")}
                  </Button>
                </div>
              </div>
              <MemberList teamId={team.id} members={team.members || []} />
            </div>
            <div className="w-full px-2 mt-8 ml-2 sm:w-3/12 sm:mt-0 min-w-32">
              <TeamSettingsRightSidebar team={team} />
            </div>
          </div>
          {showMemberInvitationModal && (
            <MemberInvitationModal team={team} onExit={() => setShowMemberInvitationModal(false)} />
          )}
        </>
      ) : (
        <Loader />
      )}
    </Shell>
  );
}

// export const getServerSideProps = async (context: GetServerSidePropsContext) => {
//   const session = await getSession(context);

//   if (!session?.user?.id) {
//     return {
//       redirect: {
//         permanent: false,
//         destination: "/auth/login",
//       },
//     };
//   }

//   // const team = await getTeamWithMembers(Number(context.params?.id));

//   // if (!team) return { notFound: true };

//   return { props: { id: Number(context.query?.id) } };
// };

export default TeamSettingsPage;
