import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@coss/ui/components/badge";

export function TeamBadge() {
  const { t } = useLocale();
  return <Badge variant="warning" className="bg-orange-200! text-orange-900">{t("teams")}</Badge>;
}

export function OrgBadge() {
  const { t } = useLocale();
  return (
    <Badge variant="warning" className="bg-purple-200! text-purple-900">
      {t("orgs")}
    </Badge>
  );
}
