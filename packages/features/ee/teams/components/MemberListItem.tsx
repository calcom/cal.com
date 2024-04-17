import classNames from "classnames";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import {
  Button,
  ButtonGroup,
  ConfirmationDialogContent,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  showToast,
  Tooltip,
  UserAvatar,
} from "@calcom/ui";

import MemberChangeRoleModal from "./MemberChangeRoleModal";
import TeamAvailabilityModal from "./TeamAvailabilityModal";
import TeamPill, { TeamRole } from "./TeamPill";

interface Props {
  team: RouterOutputs["viewer"]["teams"]["get"];
  member: RouterOutputs["viewer"]["teams"]["get"]["members"][number];
  isOrgAdminOrOwner: boolean | undefined;
}

/** TODO: Migrate the one in apps/web to tRPC package */
const useCurrentUserId = () => {
  const query = useMeQuery();
  const user = query.data;
  return user?.id;
};

const checkIsOrg = (team: Props["team"]) => {
  return team.isOrganization;
};

export default function MemberListItem(props: Props) {
  const { t, i18n } = useLocale();

  const utils = trpc.useUtils();
  const [showChangeMemberRoleModal, setShowChangeMemberRoleModal] = useState(false);
  const [showTeamAvailabilityModal, setShowTeamAvailabilityModal] = useState(false);
  const [showImpersonateModal, setShowImpersonateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const removeMemberMutation = trpc.viewer.teams.removeMember.useMutation({
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
      await utils.viewer.eventTypes.invalidate();
      await utils.viewer.organizations.listMembers.invalidate();
      await utils.viewer.organizations.getMembers.invalidate();
      showToast(t("success"), "success");
    },
    async onError(err) {
      showToast(err.message, "error");
    },
  });

  const resendInvitationMutation = trpc.viewer.teams.resendInvitation.useMutation({
    onSuccess: () => {
      showToast(t("invitation_resent"), "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const ownersInTeam = () => {
    const { members } = props.team;
    const owners = members.filter((member) => member["role"] === MembershipRole.OWNER && member["accepted"]);
    return owners.length;
  };

  const currentUserId = useCurrentUserId();

  const name =
    props.member.name ||
    (() => {
      const emailName = props.member.email.split("@")[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    })();

  const removeMember = () =>
    removeMemberMutation.mutate({
      teamId: props.team?.id,
      memberId: props.member.id,
      isOrg: checkIsOrg(props.team),
    });

  const editMode =
    (props.team.membership?.role === MembershipRole.OWNER &&
      (props.member.role !== MembershipRole.OWNER ||
        ownersInTeam() > 1 ||
        props.member.id !== currentUserId)) ||
    (props.team.membership?.role === MembershipRole.ADMIN && props.member.role !== MembershipRole.OWNER) ||
    props.isOrgAdminOrOwner;
  const impersonationMode =
    editMode &&
    !props.member.disableImpersonation &&
    props.member.accepted &&
    process.env.NEXT_PUBLIC_TEAM_IMPERSONATION === "true";
  const resendInvitation = editMode && !props.member.accepted;

  const bookerUrl = props.member.bookerUrl;
  const bookerUrlWithoutProtocol = bookerUrl.replace(/^https?:\/\//, "");
  const bookingLink = !!props.member.username && `${bookerUrlWithoutProtocol}/${props.member.username}`;
  const isAdmin = props.team && ["ADMIN", "OWNER"].includes(props.team.membership?.role);
  const appList = props.member.connectedApps?.map(({ logo, name, externalId }) => {
    return logo ? (
      externalId ? (
        <div className="ltr:mr-2 rtl:ml-2 ">
          <Tooltip content={externalId}>
            <img className="h-5 w-5" src={logo} alt={`${name} logo`} />
          </Tooltip>
        </div>
      ) : (
        <div className="ltr:mr-2 rtl:ml-2">
          <img className="h-5 w-5" src={logo} alt={`${name} logo`} />
        </div>
      )
    ) : null;
  });

  return (
    <li className="divide-subtle divide-y px-5">
      <div className="my-4 flex justify-between">
        <div className="flex w-full flex-col justify-between truncate sm:flex-row">
          <div className="flex">
            <UserAvatar
              noOrganizationIndicator
              size="sm"
              user={props.member}
              className="h-10 w-10 rounded-full"
            />
            <div className="ms-3 inline-block">
              <div className="mb-1 flex" data-testid={`member-${props.member.username}`}>
                <span data-testid="member-name" className="text-default mr-2 text-sm font-bold leading-4">
                  {name}
                </span>
                {!props.member.accepted && (
                  <TeamPill data-testid="member-pending" color="orange" text={t("pending")} />
                )}
                {isAdmin && props.member.accepted && appList}
                {props.member.role && <TeamRole data-testid="member-role" role={props.member.role} />}
              </div>
              <div className="text-default flex items-center">
                <span
                  className=" block text-sm"
                  data-testid={
                    props.member.accepted
                      ? "member-email"
                      : `email-${props.member.email.replace("@", "")}-pending`
                  }
                  data-email={props.member.email}>
                  {props.member.email}
                </span>
                {bookingLink && (
                  <>
                    <span className="text-default mx-2 block">•</span>
                    <a
                      target="_blank"
                      href={`${bookerUrl}/${props.member.username}`}
                      className="text-default block text-sm">
                      {bookingLink}
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        {props.team.membership?.accepted && (
          <div className="flex items-center justify-center">
            <ButtonGroup combined containerProps={{ className: "border-default hidden md:flex" }}>
              {/* TODO: bring availability back. right now its ugly and broken
               <Tooltip
                content={
                  props.member.accepted
                    ? t("team_view_user_availability")
                    : t("team_view_user_availability_disabled")
                }>
                <Button
                  disabled={!props.member.accepted}
                  onClick={() => (props.member.accepted ? setShowTeamAvailabilityModal(true) : null)}
                  color="secondary"
                  variant="icon"
                  StartIcon="clock"
                />
              </Tooltip> */}
              {!!props.member.accepted && (
                <Tooltip content={t("view_public_page")}>
                  <Button
                    target="_blank"
                    href={`${bookerUrl}/${props.member.username}`}
                    color="secondary"
                    className={classNames(!editMode ? "rounded-r-md" : "")}
                    variant="icon"
                    StartIcon="external-link"
                    disabled={!props.member.accepted}
                  />
                </Tooltip>
              )}
              {editMode && (
                <Dropdown>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="radix-state-open:rounded-r-md"
                      color="secondary"
                      variant="icon"
                      StartIcon="ellipsis"
                    />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>
                      <DropdownItem
                        type="button"
                        onClick={() => setShowChangeMemberRoleModal(true)}
                        StartIcon="pencil">
                        {t("edit")}
                      </DropdownItem>
                    </DropdownMenuItem>
                    {impersonationMode && (
                      <>
                        <DropdownMenuItem>
                          <DropdownItem
                            type="button"
                            onClick={() => setShowImpersonateModal(true)}
                            StartIcon="lock">
                            {t("impersonate")}
                          </DropdownItem>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {resendInvitation && (
                      <DropdownMenuItem>
                        <DropdownItem
                          type="button"
                          onClick={() => {
                            resendInvitationMutation.mutate({
                              teamId: props.team?.id,
                              email: props.member.email,
                              language: i18n.language,
                            });
                          }}
                          StartIcon="send">
                          {t("resend_invitation")}
                        </DropdownItem>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem>
                      <DropdownItem
                        type="button"
                        onClick={() => setShowDeleteModal(true)}
                        color="destructive"
                        StartIcon="user-x">
                        {t("remove")}
                      </DropdownItem>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </Dropdown>
              )}
            </ButtonGroup>
            <div className="flex md:hidden">
              <Dropdown>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="icon" color="minimal" StartIcon="ellipsis" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem className="outline-none">
                    <DropdownItem
                      disabled={!props.member.accepted}
                      href={!props.member.accepted ? undefined : `/${props.member.username}`}
                      target="_blank"
                      type="button"
                      StartIcon="external-link">
                      {t("view_public_page")}
                    </DropdownItem>
                  </DropdownMenuItem>
                  {editMode && (
                    <>
                      <DropdownMenuItem>
                        <DropdownItem
                          type="button"
                          onClick={() => setShowChangeMemberRoleModal(true)}
                          StartIcon="pencil">
                          {t("edit")}
                        </DropdownItem>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <DropdownItem
                          type="button"
                          color="destructive"
                          onClick={() => setShowDeleteModal(true)}
                          StartIcon="user-x">
                          {t("remove")}
                        </DropdownItem>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </Dropdown>
            </div>
          </div>
        )}
      </div>

      {editMode && (
        <Dialog open={showDeleteModal} onOpenChange={() => setShowDeleteModal((prev) => !prev)}>
          <ConfirmationDialogContent
            variety="danger"
            title={t("remove_member")}
            confirmBtnText={t("confirm_remove_member")}
            onConfirm={removeMember}>
            {t("remove_member_confirmation_message")}
          </ConfirmationDialogContent>
        </Dialog>
      )}

      {showImpersonateModal && props.member.username && (
        <Dialog open={showImpersonateModal} onOpenChange={() => setShowImpersonateModal(false)}>
          <DialogContent type="creation" title={t("impersonate")} description={t("impersonation_user_tip")}>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await signIn("impersonation-auth", {
                  username: props.member.email,
                  teamId: props.team.id,
                });
                setShowImpersonateModal(false);
              }}>
              <DialogFooter showDivider className="mt-8">
                <DialogClose color="secondary">{t("cancel")}</DialogClose>
                <Button color="primary" type="submit">
                  {t("impersonate")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {showChangeMemberRoleModal && (
        <MemberChangeRoleModal
          isOpen={showChangeMemberRoleModal}
          currentMember={props.team.membership.role}
          teamId={props.team?.id}
          memberId={props.member.id}
          initialRole={props.member.role as MembershipRole}
          onExit={() => setShowChangeMemberRoleModal(false)}
        />
      )}
      {showTeamAvailabilityModal && (
        <Dialog open={showTeamAvailabilityModal} onOpenChange={() => setShowTeamAvailabilityModal(false)}>
          <DialogContent type="creation" size="md">
            <TeamAvailabilityModal team={props.team} member={props.member} />
            <DialogFooter>
              <Button onClick={() => setShowTeamAvailabilityModal(false)}>{t("done")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </li>
  );
}
