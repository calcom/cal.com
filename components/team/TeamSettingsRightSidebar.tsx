import { ClockIcon, ExternalLinkIcon, LinkIcon, TrashIcon } from "@heroicons/react/solid";
import Link from "next/link";
import React from "react";

import { useLocale } from "@lib/hooks/useLocale";
import showToast from "@lib/notification";
import { TeamWithMembers } from "@lib/queries/teams";

import LinkIconButton from "@components/ui/LinkIconButton";

export default function TeamSettingsRightSidebar(props: { team: TeamWithMembers }) {
  const { t } = useLocale();

  const permalink = `${process.env.NEXT_PUBLIC_APP_URL}/team/${props.team?.slug}`;

  //   const deleteTeam = () => {
  //   return fetch("/api/teams/" + props.team?.id, {
  //     method: "DELETE",
  //   });
  // };

  return (
    <div className="px-2 space-y-6">
      {/* 
        // TODO: add ability to hide teams from main view, maybe this belongs on the view itself instead? or both
        <Switch
        name="isHidden"
        defaultChecked={hidden}
        onCheckedChange={setHidden}
        label={"Hide team from view"}
      /> */}
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
        <LinkIconButton Icon={TrashIcon}>{t("disband_team")}</LinkIconButton>
      </div>
      <div className="mt-5 space-y-1">
        <LinkIconButton Icon={ClockIcon}>{"View Availability"}</LinkIconButton>
        <p className="mt-2 text-sm text-gray-500">See your team members availability at a glance.</p>
      </div>
    </div>
  );
}
