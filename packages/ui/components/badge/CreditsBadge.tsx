import Link from "next/link";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Tooltip } from "../tooltip";
import { Badge } from "./Badge";

export const CreditsBadge = function CreditsBadge({ teamId }: { teamId?: number }) {
  const { t } = useLocale();

  return (
    <Tooltip content={t("requires_credits_tooltip")}>
      <Link href={teamId ? `/settings/teams/${teamId}/billing` : "/settings/billing"}>
        <Badge variant="gray" className="whitespace-nowrap">
          {t("requires_credits")}
        </Badge>
      </Link>
    </Tooltip>
  );
};
