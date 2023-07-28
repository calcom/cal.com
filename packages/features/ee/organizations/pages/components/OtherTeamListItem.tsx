import { useRouter } from "next/router";
import { useState } from "react";

import type { NewMemberForm } from "@calcom/ee/teams/components/MemberInvitationModal";
import MemberInvitationModal from "@calcom/ee/teams/components/MemberInvitationModal";
import classNames from "@calcom/lib/classNames";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import {
  Avatar,
  Button,
  ButtonGroup,
  ConfirmationDialogContent,
  Dialog,
  DialogTrigger,
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
  Edit2,
  ExternalLink,
  Globe,
  Link as LinkIcon,
  MoreHorizontal,
  Send,
  Trash,
} from "@calcom/ui/components/icon";

import { useOrgBranding } from "../../../organizations/context/provider";

interface Props {
  team: RouterOutputs["viewer"]["organizations"]["listOtherTeams"][number];
  key: number;
  onActionSelect: (text: string) => void;
  isLoading?: boolean;
  hideDropdown: boolean;
  setHideDropdown: (value: boolean) => void;
}

export default function OtherTeamListItem(props: Props) {
  const { t, i18n } = useLocale();

  const router = useRouter();
  const utils = trpc.useContext();
  const team = props.team;

  const showDialog = router.query.inviteModal === "true";
  const [openMemberInvitationModal, setOpenMemberInvitationModal] = useState(showDialog);
  const [openInviteLinkSettingsModal, setOpenInviteLinkSettingsModal] = useState(false);

  const teamQuery = trpc.viewer.teams.get.useQuery({ teamId: team?.id });
  const inviteMemberMutation = trpc.viewer.teams.inviteMember.useMutation();

  const acceptOrLeaveMutation = trpc.viewer.teams.acceptOrLeave.useMutation({
    onSuccess: () => {
      utils.viewer.teams.list.invalidate();
      utils.viewer.teams.listInvites.invalidate();
    },
  });

  const orgBranding = useOrgBranding();

  const isOwner = props.team.role === MembershipRole.OWNER;
  const isInvitee = !props.team.accepted;
  const { hideDropdown, setHideDropdown } = props;

  if (!team) return <></>;

  const teamInfo = (
    <div className="item-center flex px-5 py-5">
      <Avatar
        size="md"
        imageSrc={getPlaceholderAvatar(team?.logo, team?.name as string)}
        alt="Team Logo"
        className="inline-flex justify-center"
      />
      <div className="ms-3 inline-block truncate">
        <span className="text-default text-sm font-bold">{team.name}</span>
        <span className="text-muted block text-xs">
          {team.slug
            ? orgBranding
              ? `${orgBranding.fullDomain}${team.slug}`
              : `${process.env.NEXT_PUBLIC_WEBSITE_URL}/team/${team.slug}`
            : "Unpublished team"}
        </span>
      </div>
    </div>
  );

  const handleSubmit = async (
    values: NewMemberForm,
    team: RouterOutputs["viewer"]["organizations"]["listOtherTeams"][number],
    inviteMemberMutation: ReturnType<typeof trpc.viewer.teams.inviteMember.useMutation>,
    resetFields: () => void,
    i18n: typeof import("i18next").default,
    t: typeof import("i18next").t,
    showToast: typeof import("@calcom/ui").showToast
  ) => {
    try {
      await inviteMemberMutation.mutateAsync({
        teamId: team.id,
        language: i18n.language,
        role: values.role,
        usernameOrEmail: values.emailOrUsername,
        sendEmailInvitation: values.sendInviteEmail,
      });

      await utils.viewer.teams.get.invalidate();
      setOpenMemberInvitationModal(false);

      if (values.sendInviteEmail) {
        if (Array.isArray(values.emailOrUsername)) {
          showToast(
            t("email_invite_team_bulk", {
              userCount: values.emailOrUsername.length,
            }),
            "success"
          );
          resetFields();
        } else {
          showToast(
            t("email_invite_team", {
              email: values.emailOrUsername,
            }),
            "success"
          );
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        showToast(error.message, "error");
      } else {
        showToast("Something went wrong. Please reach out for customer support.", "error");
      }
    }
  };

  return (
    <li>
      <MemberInvitationModal
        isOpen={openMemberInvitationModal}
        teamId={team.id}
        // token={team.inviteToken?.token}
        onExit={() => {
          setOpenMemberInvitationModal(false);
        }}
        isLoading={inviteMemberMutation.isLoading}
        onSubmit={(values, resetFields) => {
          handleSubmit(values, team, inviteMemberMutation, resetFields, i18n, t, showToast);
        }}
        onSettingsOpen={() => {
          setOpenMemberInvitationModal(false);
          setOpenInviteLinkSettingsModal(true);
        }}
        members={teamQuery?.data?.members || []}
      />
      <div className={classNames("flex items-center  justify-between", !isInvitee && "hover:bg-muted group")}>
        {teamInfo}
        <div className="px-5 py-5">
          <div className="flex space-x-2 rtl:space-x-reverse">
            <ButtonGroup combined>
              {team.slug && (
                <Tooltip content={t("copy_link_team")}>
                  <Button
                    color="secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${
                          orgBranding
                            ? `${orgBranding.fullDomain}`
                            : process.env.NEXT_PUBLIC_WEBSITE_URL + "/team/"
                        }${team.slug}`
                      );
                      showToast(t("link_copied"), "success");
                    }}
                    variant="icon"
                    StartIcon={LinkIcon}
                  />
                </Tooltip>
              )}
              <Dropdown>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="radix-state-open:rounded-r-md"
                    type="button"
                    color="secondary"
                    variant="icon"
                    StartIcon={MoreHorizontal}
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent hidden={hideDropdown}>
                  <DropdownMenuItem>
                    <DropdownItem
                      type="button"
                      href={"/settings/teams/other/" + team.id + "/profile"}
                      StartIcon={Edit2}>
                      {t("edit_team") as string}
                    </DropdownItem>
                  </DropdownMenuItem>

                  {!team.slug && <TeamPublishButton teamId={team.id} />}
                  {team.slug && (
                    <DropdownMenuItem>
                      <DropdownItem
                        type="button"
                        target="_blank"
                        href={`${
                          orgBranding
                            ? `${orgBranding.fullDomain}`
                            : `${process.env.NEXT_PUBLIC_WEBSITE_URL}/team/other/`
                        }${team.slug}`}
                        StartIcon={ExternalLink}>
                        {t("preview_team") as string}
                      </DropdownItem>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem>
                    <DropdownItem
                      type="button"
                      onClick={() => {
                        setOpenMemberInvitationModal(true);
                      }}
                      StartIcon={Send}>
                      {t("invite_team_member") as string}
                    </DropdownItem>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  {isOwner && (
                    <DropdownMenuItem>
                      <Dialog open={hideDropdown} onOpenChange={setHideDropdown}>
                        <DialogTrigger asChild>
                          <DropdownItem
                            color="destructive"
                            type="button"
                            StartIcon={Trash}
                            onClick={(e) => {
                              e.stopPropagation();
                            }}>
                            {t("disband_team")}
                          </DropdownItem>
                        </DialogTrigger>
                        <ConfirmationDialogContent
                          variety="danger"
                          title={t("disband_team")}
                          confirmBtnText={t("confirm_disband_team")}
                          isLoading={props.isLoading}
                          onConfirm={() => {
                            props.onActionSelect("disband");
                          }}>
                          {t("disband_team_confirmation_message")}
                        </ConfirmationDialogContent>
                      </Dialog>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </Dropdown>
            </ButtonGroup>
          </div>
        </div>
      </div>
    </li>
  );
}

const TeamPublishButton = ({ teamId }: { teamId: number }) => {
  const { t } = useLocale();
  const router = useRouter();
  const publishTeamMutation = trpc.viewer.teams.publish.useMutation({
    onSuccess(data) {
      router.push(data.url);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  return (
    <DropdownMenuItem>
      <DropdownItem
        type="button"
        onClick={() => {
          publishTeamMutation.mutate({ teamId });
        }}
        StartIcon={Globe}>
        {t("team_publish")}
      </DropdownItem>
    </DropdownMenuItem>
  );
};
