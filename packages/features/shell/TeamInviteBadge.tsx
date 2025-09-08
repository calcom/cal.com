import { hasTeamInvitation } from "@calid/features/modules/teams/hooks/hasTeamInvitation";
import { Badge } from "@calid/features/ui/components/badge";

import { useLocale } from "@calcom/lib/hooks/useLocale";

export function TeamInviteBadge() {
  const { t } = useLocale();
  const { hasPendingInvitations, isLoading } = hasTeamInvitation();

  if (
    isLoading ||
    !hasPendingInvitations ||
    (Array.isArray(hasPendingInvitations) && hasPendingInvitations.length === 0)
  ) {
    return null;
  }

  return (
    <Badge size="sm" variant="default">
      {t("team_invitation_notification_badge")}
    </Badge>
  );
}
