import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@coss/ui/components/badge";
import { Tabs, TabsList, TabsTab } from "@coss/ui/components/tabs";
import posthog from "posthog-js";

export type BillingPeriod = "annual" | "monthly";

interface BillingPeriodToggleProps {
  billingPeriod: BillingPeriod;
  onBillingPeriodChange: (period: BillingPeriod) => void;
  compact?: boolean;
  tracking?: {
    source: string;
    target: string;
  };
}

export function BillingPeriodToggle({
  billingPeriod,
  onBillingPeriodChange,
  compact = false,
  tracking,
}: BillingPeriodToggleProps): JSX.Element {
  const { t } = useLocale();

  return (
    <Tabs
      value={billingPeriod}
      onValueChange={(value): void => {
        if (value) {
          const newPeriod = value as BillingPeriod;
          onBillingPeriodChange(newPeriod);
          if (tracking) {
            posthog.capture("upgrade_plan_dialog_billing_period_changed", {
              source: tracking.source,
              target: tracking.target,
              billingPeriod: newPeriod,
            });
          }
        }
      }}
    >
      <TabsList
        className={compact ? "rounded-md bg-muted p-0.5" : "rounded-lg bg-muted p-1"}
      >
        <TabsTab
          value="monthly"
          className={compact
            ? "ml-0.5 rounded-[5px] px-2 py-1 text-xs"
            : "ml-1 rounded-md"}
        >
          {t("monthly")}
        </TabsTab>
        <TabsTab
          value="annual"
          className={compact
            ? "gap-1 rounded-[5px] px-2 py-1 text-xs"
            : "gap-1 rounded-md"}
        >
          {t("upgrade_billing_annual")}
          <Badge variant="info" size="sm" className={compact ? "text-[10px] px-1 py-0" : ""}>
            {t("discount_25")}
          </Badge>
        </TabsTab>
      </TabsList>
    </Tabs>
  );
}
