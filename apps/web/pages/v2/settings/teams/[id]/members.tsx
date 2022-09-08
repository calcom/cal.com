import { MembershipRole } from "@prisma/client";
import { useRouter } from "next/router";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui/Icon";
import { Alert, Button } from "@calcom/ui/v2/core";
import Meta from "@calcom/ui/v2/core/Meta";
import { getLayout } from "@calcom/ui/v2/core/layouts/AdminLayout";

import MemberInvitationModal from "@components/v2/settings/teams/MemberInvitationModal";
import MemberListItem from "@components/v2/settings/teams/MemberListItem";
import { UpgradeToFlexibleProModal } from "@components/v2/settings/teams/UpgradeToFlexibleProModal";

const MembersView = () => {
  const { t } = useLocale();
  const router = useRouter();

  const { data: team } = trpc.useQuery(["viewer.teams.get", { teamId: Number(router.query.id) }], {
    onError: () => {
      router.push("/settings");
    },
  });

  const [showMemberInvitationModal, setShowMemberInvitationModal] = useState(false);

  const isAdmin =
    team && (team.membership.role === MembershipRole.OWNER || team.membership.role === MembershipRole.ADMIN);

  return (
    <>
      <Meta title="team_members" description="members_team_description" />
      <div>
        {team && (
          <>
            {team.membership.role === MembershipRole.OWNER &&
            team.membership.isMissingSeat &&
            team.requiresUpgrade ? (
              <Alert
                severity="warning"
                title={t("hidden_team_member_title")}
                message={
                  <>
                    {t("hidden_team_owner_message")} <UpgradeToFlexibleProModal teamId={team.id} />
                  </>
                }
                className="mb-4 "
              />
            ) : (
              <>
                {team.membership.isMissingSeat && (
                  <Alert
                    severity="warning"
                    title={t("hidden_team_member_title")}
                    message={t("hidden_team_member_message")}
                    className="mb-4 "
                  />
                )}
                {team.membership.role === MembershipRole.OWNER && team.requiresUpgrade && (
                  <Alert
                    severity="warning"
                    title={t("upgrade_to_flexible_pro_title")}
                    message={
                      <span>
                        {t("upgrade_to_flexible_pro_message")} <br />
                        <UpgradeToFlexibleProModal teamId={team.id} />
                      </span>
                    }
                    className="mb-4"
                  />
                )}
              </>
            )}
          </>
        )}
        {isAdmin && (
          <div className="relative mb-5 flex w-full items-center ">
            <Button
              type="button"
              color="primary"
              StartIcon={Icon.FiPlus}
              className="ml-auto"
              onClick={() => setShowMemberInvitationModal(true)}
              data-testid="new-member-button">
              {t("add")}
            </Button>
          </div>
        )}
        <div>
          <ul className="divide-y divide-gray-200 rounded-md border ">
            {team?.members.map((member) => {
              return <MemberListItem key={member.id} team={team} member={member} />;
            })}
          </ul>
        </div>
      </div>
      {showMemberInvitationModal && team && (
        <MemberInvitationModal
          isOpen={showMemberInvitationModal}
          team={team}
          currentMember={team.membership.role}
          onExit={() => setShowMemberInvitationModal(false)}
        />
      )}
    </>
  );
};

MembersView.getLayout = getLayout;

export default MembersView;
