import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import InviteLinkSettingsModal from "@calcom/ee/teams/components/InviteLinkSettingsModal";
import MemberInvitationModal from "@calcom/ee/teams/components/MemberInvitationModal";
import classNames from "@calcom/lib/classNames";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import {
  Avatar,
  Badge,
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
  Check,
  Edit2,
  ExternalLink,
  Globe,
  Link as LinkIcon,
  LogOut,
  MoreHorizontal,
  Send,
  Trash,
  X,
} from "@calcom/ui/components/icon";

import { useOrgBranding } from "../../organizations/context/provider";
import { TeamRole } from "./TeamPill";

interface Props {
  team: RouterOutputs["viewer"]["teams"]["list"][number];
  key: number;
  onActionSelect: (text: string) => void;
  isLoading?: boolean;
  hideDropdown: boolean;
  setHideDropdown: (value: boolean) => void;
}

export default function TeamListItem(props: Props) {
  const searchParams = useCompatSearchParams();
  const { t, i18n } = useLocale();
  const utils = trpc.useContext();
  const team = props.team;

  const showDialog = searchParams?.get("inviteModal") === "true";
  const [openMemberInvitationModal, setOpenMemberInvitationModal] = useState(showDialog);
  const [openInviteLinkSettingsModal, setOpenInviteLinkSettingsModal] = useState(false);

  const teamQuery = trpc.viewer.teams.get.useQuery({ teamId: team?.id });
  const inviteMemberMutation = trpc.viewer.teams.inviteMember.useMutation();

  const acceptOrLeaveMutation = trpc.viewer.teams.acceptOrLeave.useMutation({
    onSuccess: () => {
      showToast(t("success"), "success");
      utils.viewer.teams.get.invalidate();
      utils.viewer.teams.list.invalidate();
      utils.viewer.teams.hasTeamPlan.invalidate();
      utils.viewer.teams.listInvites.invalidate();
    },
  });

  function acceptOrLeave(accept: boolean) {
    acceptOrLeaveMutation.mutate({
      teamId: team?.id as number,
      accept,
    });
  }

  const acceptInvite = () => acceptOrLeave(true);
  const declineInvite = () => acceptOrLeave(false);
  const orgBranding = useOrgBranding();

  const isOwner = props.team.role === MembershipRole.OWNER;
  const isInvitee = !props.team.accepted;
  const isAdmin = props.team.role === MembershipRole.OWNER || props.team.role === MembershipRole.ADMIN;
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
          {team.slug ? (
            orgBranding ? (
              `${orgBranding.fullDomain}/${team.slug}`
            ) : (
              `${process.env.NEXT_PUBLIC_WEBSITE_URL}/team/${team.slug}`
            )
          ) : (
            <Badge>{t("upgrade")}</Badge>
          )}
        </span>
      </div>
    </div>
  );

  return (
    <li className="">
      <MemberInvitationModal
        isOpen={openMemberInvitationModal}
        teamId={team.id}
        token={team.inviteToken?.token}
        onExit={() => {
          setOpenMemberInvitationModal(false);
        }}
        isLoading={inviteMemberMutation.isLoading}
        onSubmit={(values, resetFields) => {
          inviteMemberMutation.mutate(
            {
              teamId: team.id,
              language: i18n.language,
              role: values.role,
              usernameOrEmail: values.emailOrUsername,
            },
            {
              onSuccess: async (data) => {
                await utils.viewer.teams.get.invalidate();
                setOpenMemberInvitationModal(false);

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
              },
              onError: (error) => {
                showToast(error.message, "error");
              },
            }
          );
        }}
        onSettingsOpen={() => {
          setOpenMemberInvitationModal(false);
          setOpenInviteLinkSettingsModal(true);
        }}
        members={teamQuery?.data?.members || []}
      />
      {team.inviteToken && (
        <InviteLinkSettingsModal
          isOpen={openInviteLinkSettingsModal}
          teamId={team.id}
          token={team.inviteToken?.token}
          expiresInDays={team.inviteToken?.expiresInDays || undefined}
          onExit={() => {
            setOpenInviteLinkSettingsModal(false);
            setOpenMemberInvitationModal(true);
          }}
        />
      )}
      <div className={classNames("flex items-center  justify-between", !isInvitee && "hover:bg-muted group")}>
        {!isInvitee ? (
          team.slug ? (
            <Link
              data-testid="team-list-item-link"
              href={`/settings/teams/${team.id}/profile`}
              className="flex-grow cursor-pointer truncate text-sm"
              title={`${team.name}`}>
              {teamInfo}
            </Link>
          ) : (
            <TeamPublishSection teamId={team.id}>{teamInfo}</TeamPublishSection>
          )
        ) : (
          teamInfo
        )}
        <div className="px-5 py-5">
          {isInvitee ? (
            <>
              <div className="hidden justify-center sm:flex">
                <Button type="button" color="secondary" onClick={declineInvite}>
                  {t("reject")}
                </Button>
                <Button
                  type="button"
                  color="secondary"
                  data-testid={`accept-invitation-${team.id}`}
                  StartIcon={Check}
                  className="me-2 ms-2"
                  onClick={acceptInvite}>
                  {t("accept")}
                </Button>
              </div>
              <div className="block sm:hidden">
                <Dropdown>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" color="minimal" variant="icon" StartIcon={MoreHorizontal} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>
                      <DropdownItem type="button" StartIcon={Check} onClick={acceptInvite}>
                        {t("accept")}
                      </DropdownItem>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <DropdownItem color="destructive" type="button" StartIcon={X} onClick={declineInvite}>
                        {t("reject")}
                      </DropdownItem>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </Dropdown>
              </div>
            </>
          ) : (
            <div className="flex space-x-2 rtl:space-x-reverse">
              <TeamRole role={team.role} />
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
                              : `${process.env.NEXT_PUBLIC_WEBSITE_URL}/team`
                          }/${team.slug}`
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
                    {isAdmin && (
                      <DropdownMenuItem>
                        <DropdownItem
                          type="button"
                          href={`/settings/teams/${team.id}/profile`}
                          StartIcon={Edit2}>
                          {t("edit_team") as string}
                        </DropdownItem>
                      </DropdownMenuItem>
                    )}
                    {!team.slug && <TeamPublishButton teamId={team.id} />}
                    {team.slug && (
                      <DropdownMenuItem>
                        <DropdownItem
                          type="button"
                          target="_blank"
                          href={`${
                            orgBranding
                              ? `${orgBranding.fullDomain}`
                              : `${process.env.NEXT_PUBLIC_WEBSITE_URL}/team`
                          }/${team.slug}`}
                          StartIcon={ExternalLink}>
                          {t("preview_team") as string}
                        </DropdownItem>
                      </DropdownMenuItem>
                    )}
                    {isAdmin && (
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
                    )}
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

                    {!isOwner && (
                      <DropdownMenuItem>
                        <Dialog>
                          <DialogTrigger asChild>
                            <DropdownItem
                              color="destructive"
                              type="button"
                              StartIcon={LogOut}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}>
                              {t("leave_team")}
                            </DropdownItem>
                          </DialogTrigger>
                          <ConfirmationDialogContent
                            variety="danger"
                            title={t("leave_team")}
                            confirmBtnText={t("confirm_leave_team")}
                            onConfirm={declineInvite}>
                            {t("leave_team_confirmation_message")}
                          </ConfirmationDialogContent>
                        </Dialog>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </Dropdown>
              </ButtonGroup>
            </div>
          )}
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

const TeamPublishSection = ({ children, teamId }: { children: React.ReactNode; teamId: number }) => {
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
    <button
      className="block flex-grow cursor-pointer truncate text-left text-sm"
      type="button"
      onClick={() => {
        publishTeamMutation.mutate({ teamId });
      }}>
      {children}
    </button>
  );
};
