import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@coss/ui/components/badge";
import { Toggle, ToggleGroup } from "@coss/ui/components/toggle-group";
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
    <ToggleGroup
      value={[billingPeriod]}
      onValueChange={(value): void => {
        if (value.length > 0) {
          const newPeriod = value[0] as BillingPeriod;
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
      className="rounded-lg bg-muted p-1"
      size="sm"
    >
      <Toggle
        value="monthly"
        className="ml-1 rounded-md data-pressed:bg-default data-pressed:shadow-sm"
      >
        {t("monthly")}
      </Toggle>
      <Toggle
        value="annual"
        className="gap-1 rounded-md data-pressed:bg-default data-pressed:shadow-sm"
      >
        {t("upgrade_billing_annual")}
        <Badge variant="info" size="sm">
          {t("discount_25")}
        </Badge>
      </Toggle>
    </ToggleGroup>
  );
}
