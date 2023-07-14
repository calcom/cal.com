import { useRouter } from "next/router";
import { useState } from "react";

import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { UserListTable } from "@calcom/features/users/components/UserTable/UserListTable";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Button, Meta, showToast } from "@calcom/ui";
import { Plus } from "@calcom/ui/components/icon";

type Team = RouterOutputs["viewer"]["teams"]["get"];

interface MembersListProps {
  team: Team | undefined;
}

const checkIfExist = (comp: string, query: string) =>
  comp.toLowerCase().replace(/\s+/g, "").includes(query.toLowerCase().replace(/\s+/g, ""));

const MembersView = () => {
  const { t, i18n } = useLocale();

  const router = useRouter();
  const utils = trpc.useContext();
  const showDialog = router.query.inviteModal === "true";
  const [showMemberInvitationModal, setShowMemberInvitationModal] = useState(showDialog);

  const inviteMemberMutation = trpc.viewer.teams.inviteMember.useMutation({
    async onSuccess(data) {
      await utils.viewer.organizations.listMembers.invalidate();
      setShowMemberInvitationModal(false);
      if (data.sendEmailInvitation) {
        if (Array.isArray(data.usernameOrEmail)) {
          showToast(
            t("email_invite_team_bulk", {
              userCount: data.usernameOrEmail.length,
            }),
            "success"
          );
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
  });

  // Move to a new query to just get the team membership.
  // const isInviteOpen = !team?.membership.accepted;
  const isAdminOrOwner = false;
  const isInviteOpen = false;
  const isLoading = false;
  const team = undefined;

  return (
    <LicenseRequired>
      <Meta
        title={t("organization_members")}
        description={t("organization_description")}
        CTA={
          isAdminOrOwner ? (
            <Button
              type="button"
              color="primary"
              StartIcon={Plus}
              className="ml-auto"
              onClick={() => setShowMemberInvitationModal(true)}
              data-testid="new-organization-member-button">
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
            {/* {team && (
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
            )} */}
            <UserListTable />
          </div>
          {/* {showMemberInvitationModal && team && (
            <MemberInvitationModal
              teamId={team.id}
              isOpen={showMemberInvitationModal}
              members={team.members}
              onExit={() => setShowMemberInvitationModal(false)}
              isLoading={inviteMemberMutation.isLoading}
              onSubmit={(values) => {
                inviteMemberMutation.mutate({
                  teamId: team.id,
                  language: i18n.language,
                  role: values.role,
                  usernameOrEmail: values.emailOrUsername,
                  sendEmailInvitation: values.sendInviteEmail,
                  isOrg: true,
                });
              }}
            />
          )} */}
        </>
      )}
    </LicenseRequired>
  );
};
MembersView.getLayout = getLayout;

export default MembersView;
