import { useLocale } from "@calcom/i18n/useLocale";
import { Badge } from "@coss/ui/components/badge";
import { Tabs, TabsList, TabsTab } from "@coss/ui/components/tabs";
import posthog from "posthog-js";

export type BillingPeriod = "annual" | "monthly";

interface BillingPeriodToggleProps {
  billingPeriod: BillingPeriod;
  onBillingPeriodChange: (period: BillingPeriod) => void;
  tracking?: {
    source: string;
    target: string;
  };
}

export function BillingPeriodToggle({
  billingPeriod,
  onBillingPeriodChange,
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
      <TabsList>
        <TabsTab value="monthly">
          {t("monthly")}
        </TabsTab>
        <TabsTab
          value="annual"
        >
          {t("upgrade_billing_annual")}
          <Badge variant="info" size="sm">
            {t("discount_25")}
          </Badge>
        </TabsTab>
      </TabsList>
    </Tabs>
  );
}
