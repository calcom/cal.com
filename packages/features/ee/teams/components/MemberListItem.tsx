import { MembershipRole } from "@prisma/client";
import classNames from "classnames";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RouterOutputs, trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import {
  Avatar,
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
} from "@calcom/ui";
import {
  FiClock,
  FiExternalLink,
  FiMoreHorizontal,
  FiEdit2,
  FiLock,
  FiTrash,
} from "@calcom/ui/components/icon";

import MemberChangeRoleModal from "./MemberChangeRoleModal";
import TeamPill, { TeamRole } from "./TeamPill";
import TeamAvailabilityModal from "./v2/TeamAvailabilityModal";

interface Props {
  team: RouterOutputs["viewer"]["teams"]["get"];
  member: RouterOutputs["viewer"]["teams"]["get"]["members"][number];
}

/** TODO: Migrate the one in apps/web to tRPC package */
const useCurrentUserId = () => {
  const query = useMeQuery();
  const user = query.data;
  return user?.id;
};

export default function MemberListItem(props: Props) {
  const { t } = useLocale();

  const utils = trpc.useContext();
  const [showChangeMemberRoleModal, setShowChangeMemberRoleModal] = useState(false);
  const [showTeamAvailabilityModal, setShowTeamAvailabilityModal] = useState(false);
  const [showImpersonateModal, setShowImpersonateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const removeMemberMutation = trpc.viewer.teams.removeMember.useMutation({
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
      showToast(t("success"), "success");
    },
    async onError(err) {
      showToast(err.message, "error");
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
    removeMemberMutation.mutate({ teamId: props.team?.id, memberId: props.member.id });

  const editMode =
    (props.team.membership.role === MembershipRole.OWNER &&
      (props.member.role !== MembershipRole.OWNER ||
        ownersInTeam() > 1 ||
        props.member.id !== currentUserId)) ||
    (props.team.membership.role === MembershipRole.ADMIN && props.member.role !== MembershipRole.OWNER);
  const impersonationMode =
    editMode &&
    !props.member.disableImpersonation &&
    props.member.accepted &&
    process.env.NEXT_PUBLIC_TEAM_IMPERSONATION === "true";

  return (
    <li className="divide-y px-5">
      <div className="my-4 flex justify-between">
        <div className="flex w-full flex-col justify-between sm:flex-row">
          <div className="flex">
            <Avatar
              size="sm"
              imageSrc={WEBAPP_URL + "/" + props.member.username + "/avatar.png"}
              alt={name || ""}
              className="h-10 w-10 rounded-full"
            />

            <div className="inline-block ltr:ml-3 rtl:mr-3">
              <div className="mb-1 flex">
                <span className="mr-1 text-sm font-bold leading-4">{name}</span>

                {!props.member.accepted && <TeamPill color="orange" text={t("pending")} />}
                {props.member.role && <TeamRole role={props.member.role} />}
              </div>
              <span
                className="block text-sm text-gray-600"
                data-testid="member-email"
                data-email={props.member.email}>
                {props.member.email}
              </span>
            </div>
          </div>
        </div>
        {props.team.membership.accepted && (
          <div className="flex items-center justify-center">
            <ButtonGroup combined containerProps={{ className: "border-gray-300 hidden md:flex" }}>
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
                  StartIcon={FiClock}
                />
              </Tooltip>
              <Tooltip content={t("view_public_page")}>
                <Button
                  target="_blank"
                  href={"/" + props.member.username}
                  color="secondary"
                  className={classNames(!editMode ? "rounded-r-md" : "")}
                  variant="icon"
                  StartIcon={FiExternalLink}
                />
              </Tooltip>
              {editMode && (
                <Dropdown>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="radix-state-open:rounded-r-md"
                      color="secondary"
                      variant="icon"
                      StartIcon={FiMoreHorizontal}
                    />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>
                      <DropdownItem
                        type="button"
                        onClick={() => setShowChangeMemberRoleModal(true)}
                        StartIcon={FiEdit2}>
                        {t("edit")}
                      </DropdownItem>
                    </DropdownMenuItem>
                    {impersonationMode && (
                      <>
                        <DropdownMenuItem>
                          <DropdownItem
                            type="button"
                            onClick={() => setShowImpersonateModal(true)}
                            StartIcon={FiLock}>
                            {t("impersonate")}
                          </DropdownItem>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem>
                      <DropdownItem
                        type="button"
                        onClick={() => setShowDeleteModal(true)}
                        color="destructive"
                        StartIcon={FiTrash}>
                        {t("delete")}
                      </DropdownItem>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </Dropdown>
              )}
            </ButtonGroup>
            <div className="flex md:hidden">
              <Dropdown>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="icon" color="minimal" StartIcon={FiMoreHorizontal} />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {props.member.accepted && (
                    <DropdownMenuItem className="outline-none">
                      <DropdownItem type="button" StartIcon={FiClock}>
                        {t("team_view_user_availability")}
                      </DropdownItem>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="outline-none">
                    <DropdownItem type="button" StartIcon={FiExternalLink}>
                      {t("view_public_page")}
                    </DropdownItem>
                  </DropdownMenuItem>
                  {editMode && (
                    <>
                      <DropdownMenuItem>
                        <DropdownItem
                          type="button"
                          onClick={() => setShowChangeMemberRoleModal(true)}
                          StartIcon={FiEdit2}>
                          {t("edit")}
                        </DropdownItem>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <DropdownItem
                          type="button"
                          color="destructive"
                          onClick={() => setShowDeleteModal(true)}
                          StartIcon={FiTrash}>
                          {t("delete")}
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
        <Dialog open={showDeleteModal} onOpenChange={() => setShowDeleteModal(false)}>
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
                  username: props.member.username,
                  teamId: props.team.id,
                });
                setShowImpersonateModal(false);
              }}>
              <DialogFooter>
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
