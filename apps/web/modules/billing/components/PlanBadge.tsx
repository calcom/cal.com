import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@coss/ui/components/badge";

type PlanBadgeProps = {
  size?: "default" | "sm";
};

export function TeamBadge({ size = "default" }: PlanBadgeProps) {
  const { t } = useLocale();
  return (
    <Badge variant="warning" size={size} className="bg-orange-200! text-orange-900">
      {t("teams")}
    </Badge>
  );
}

export function OrgBadge({ size = "default" }: PlanBadgeProps) {
  const { t } = useLocale();
  return (
    <Badge variant="warning" size={size} className="bg-purple-200! text-purple-900">
      {t("orgs")}
    </Badge>
  );
}
