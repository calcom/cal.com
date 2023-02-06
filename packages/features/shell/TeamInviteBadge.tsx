import { useTeamInvites } from "@calcom/lib/hooks/useHasPaidPlan";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui";

export function TeamInviteBadge() {
  const { isLoading, listInvites } = useTeamInvites();
  const { t } = useLocale();

  if (isLoading || !listInvites || listInvites.length === 0) return null;

  return <Badge variant="default">{t("invite_team_notifcation_badge")}</Badge>;
}
