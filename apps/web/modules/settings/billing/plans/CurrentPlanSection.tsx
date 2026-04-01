import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import Link from "next/link";

type PlanContext = "personal" | "team" | "organization";

interface CurrentPlanSectionProps {
  context: PlanContext;
  planName: string;
  planPrice: string;
  billingPeriodBadge: string | null;
  renewalDateFormatted: string | null;
  teamId?: number;
  t: (key: string, opts?: Record<string, string>) => string;
}

export function CurrentPlanSection({
  context,
  planName,
  planPrice,
  billingPeriodBadge,
  renewalDateFormatted,
  teamId,
  t,
}: CurrentPlanSectionProps) {
  return (
    <CardFrame>
      <CardFrameHeader className="py-4">
        <CardFrameTitle>{t("current_plan")}</CardFrameTitle>
        {context !== "personal" && renewalDateFormatted && (
          <CardFrameDescription>
            {t("renews_on_date", { date: renewalDateFormatted })}
          </CardFrameDescription>
        )}
      </CardFrameHeader>
      <Card>
        <CardPanel className="px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm text-emphasis">
                  {planName}
                </p>
                {billingPeriodBadge && (
                  <Badge variant="outline">{billingPeriodBadge}</Badge>
                )}
              </div>
              <p className="mt-1">
                <span className="font-heading font-semibold text-emphasis text-2xl leading-none">
                  {planPrice}
                </span>
                {context !== "personal" && (
                  <span className="ml-2 text-sm text-subtle">
                    {t("upgrade_price_per_month_user")}
                  </span>
                )}
              </p>
            </div>
            {context !== "personal" && teamId && (
              <Button
                variant="outline"
                size="sm"
                render={
                  <Link
                    href={
                      context === "organization"
                        ? "/settings/organizations/billing"
                        : `/settings/teams/${teamId}/billing`
                    }
                  />
                }
              >
                {t("manage_billing")}
              </Button>
            )}
          </div>
        </CardPanel>
      </Card>
    </CardFrame>
  );
}
