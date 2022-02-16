import { ClockIcon, ExternalLinkIcon, LinkIcon, LogoutIcon, TrashIcon } from "@heroicons/react/solid";
import Link from "next/link";
import { useRouter } from "next/router";
import React from "react";

import { useLocale } from "@lib/hooks/useLocale";
import showToast from "@lib/notification";
import { TeamWithMembers } from "@lib/queries/teams";
import { trpc } from "@lib/trpc";

import { Dialog, DialogTrigger } from "@components/Dialog";
import ConfirmationDialogContent from "@components/dialog/ConfirmationDialogContent";
import CreateEventTypeButton from "@components/eventtype/CreateEventType";
import LinkIconButton from "@components/ui/LinkIconButton";

import { MembershipRole } from ".prisma/client";

export default function TeamSettingsRightSidebar(props: { team: TeamWithMembers; role: MembershipRole }) {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const router = useRouter();

  const permalink = `${process.env.NEXT_PUBLIC_APP_URL}/team/${props.team?.slug}`;

  const deleteTeamMutation = trpc.useMutation("viewer.teams.delete", {
    async onSuccess() {
      await utils.invalidateQueries(["viewer.teams.get"]);
      router.push(`/settings/teams`);
      showToast(t("your_team_updated_successfully"), "success");
    },
  });
  const acceptOrLeaveMutation = trpc.useMutation("viewer.teams.acceptOrLeave", {
    onSuccess: () => {
      utils.invalidateQueries(["viewer.teams.list"]);
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
            <LinkIconButton Icon={ExternalLinkIcon}>{t("preview")}</LinkIconButton>
          </a>
        </Link>
        <LinkIconButton
          Icon={LinkIcon}
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
                Icon={TrashIcon}>
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
                Icon={LogoutIcon}
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
            <LinkIconButton Icon={ClockIcon}>{"View Availability"}</LinkIconButton>
            <p className="mt-2 text-sm text-gray-500">See your team members availability at a glance.</p>
          </div>
        </Link>
      )}
    </div>
  );
}
