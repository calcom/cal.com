import { useLocale } from "@calcom/lib/hooks/useLocale";
import Link from "next/link";
import { Tooltip } from "../tooltip";
import { Badge } from "./Badge";

export const CreditsBadge = function CreditsBadge(_props: { teamId?: number; isOrganization?: boolean }) {
  const { t } = useLocale();

  return (
    <Tooltip content={t("requires_credits_tooltip")}>
      <Link href="/settings/billing">
        <Badge variant="gray" className="whitespace-nowrap">
          {t("requires_credits")}
        </Badge>
      </Link>
    </Tooltip>
  );
};
