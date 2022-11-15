import { MembershipRole } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/router";
import React from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TeamWithMembers } from "@calcom/lib/server/queries/teams";
import { trpc } from "@calcom/trpc/react";
import ConfirmationDialogContent from "@calcom/ui/ConfirmationDialogContent";
import { Icon } from "@calcom/ui/Icon";
import { Dialog, DialogTrigger } from "@calcom/ui/v2/core/Dialog";
import LinkIconButton from "@calcom/ui/v2/core/LinkIconButton";
import showToast from "@calcom/ui/v2/core/notifications";

import CreateEventTypeButton from "../event-types/CreateEventType";

export default function TeamSettingsRightSidebar(props: { team: TeamWithMembers; role: MembershipRole }) {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const router = useRouter();

  const permalink = `${process.env.NEXT_PUBLIC_WEBSITE_URL}/team/${props.team?.slug}`;

  const deleteTeamMutation = trpc.viewer.teams.delete.useMutation({
    async onSuccess() {
      await utils.viewer.teams.get.invalidate();
      router.push(`/settings/teams`);
      showToast(t("your_team_updated_successfully"), "success");
    },
  });
  const acceptOrLeaveMutation = trpc.viewer.teams.acceptOrLeave.useMutation({
    onSuccess: () => {
      utils.viewer.teams.list.invalidate();
      router.push(`/settings/teams`);
    },
  });

  function deleteTeam() {
    if (props.team?.id) deleteTeamMutation.mutate({ teamId: props.team.id });
  }
  function leaveTeam() {
    if (props.team?.id)
      acceptOrLeaveMutation.mutate({
        teamId: props.team.id,
        accept: false,
      });
  }

  return (
    <div className="space-y-6 px-2">
      {(props.role === MembershipRole.OWNER || props.role === MembershipRole.ADMIN) && (
        <CreateEventTypeButton
          isIndividualTeam
          canAddEvents={true}
          options={[
            {
              teamId: props.team?.id,
              name: props.team?.name,
              slug: props.team?.slug,
              image: props.team?.logo,
            },
          ]}
        />
      )}
      <div className="space-y-1">
        <Link href={permalink} passHref={true}>
          <a target="_blank">
            <LinkIconButton Icon={Icon.FiExternalLink}>{t("preview")}</LinkIconButton>
          </a>
        </Link>
        <LinkIconButton
          Icon={Icon.FiLink}
          onClick={() => {
            navigator.clipboard.writeText(permalink);
            showToast("Copied to clipboard", "success");
          }}>
          {t("copy_link_team")}
        </LinkIconButton>
        {props.role === "OWNER" ? (
          <Dialog>
            <DialogTrigger asChild>
              <LinkIconButton
                onClick={(e) => {
                  e.stopPropagation();
                }}
                Icon={Icon.FiTrash}>
                {t("disband_team")}
              </LinkIconButton>
            </DialogTrigger>
            <ConfirmationDialogContent
              variety="danger"
              title={t("disband_team")}
              confirmBtnText={t("confirm_disband_team")}
              onConfirm={deleteTeam}>
              {t("disband_team_confirmation_message")}
            </ConfirmationDialogContent>
          </Dialog>
        ) : (
          <Dialog>
            <DialogTrigger asChild>
              <LinkIconButton
                Icon={Icon.FiLogOut}
                onClick={(e) => {
                  e.stopPropagation();
                }}>
                {t("leave_team")}
              </LinkIconButton>
            </DialogTrigger>
            <ConfirmationDialogContent
              variety="danger"
              title={t("leave_team")}
              confirmBtnText={t("confirm_leave_team")}
              onConfirm={leaveTeam}>
              {t("leave_team_confirmation_message")}
            </ConfirmationDialogContent>
          </Dialog>
        )}
      </div>
      {props.team?.id && props.role !== MembershipRole.MEMBER && (
        <Link href={`/settings/teams/${props.team.id}/availability`}>
          <div className="mt-5 hidden space-y-1 sm:block">
            <LinkIconButton Icon={Icon.FiClock}>View Availability</LinkIconButton>
            <p className="mt-2 text-sm text-gray-500">See your team members availability at a glance.</p>
          </div>
        </Link>
      )}
    </div>
  );
}
