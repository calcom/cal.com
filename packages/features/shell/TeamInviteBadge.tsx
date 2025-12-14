import { useTeamInvites } from "@calcom/features/billing/hooks/useHasPaidPlan";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui/components/badge";

export function TeamInviteBadge() {
  const { isPending, listInvites } = useTeamInvites();
  const { t } = useLocale();

  if (isPending || !listInvites || listInvites.length === 0) return null;

  return <Badge variant="default">{t("invite_team_notifcation_badge")}</Badge>;
}
