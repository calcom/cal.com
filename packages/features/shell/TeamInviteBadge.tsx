import { useRouter } from "next/navigation";

import { useTeamInvites } from "@calcom/lib/hooks/useHasPaidPlan";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui";
import { TopBanner } from "@calcom/ui";

export function TeamInviteBadge() {
  const { isLoading, listInvites } = useTeamInvites();
  const { t } = useLocale();

  if (isLoading || !listInvites || listInvites.length === 0) return null;

  return <Badge variant="default">{t("invite_team_notifcation_badge")}</Badge>;
}

export function TeamInviteBanner() {
  const { isLoading, listInvites } = useTeamInvites();
  const { t } = useLocale();
  const router = useRouter();

  if (isLoading || !listInvites || listInvites.length === 0) return null;

  const invite = listInvites[0];

  return (
    <TopBanner
      text={`Team invite from ${invite.team.name}`}
      variant="default"
      actions={
        <a
          className="underline hover:cursor-pointer"
          onClick={() => {
            router.push(`/settings/teams/${invite.teamId}/members`);
          }}>
          {t("accept_invitation")}
        </a>
      }
    />
  );
}
