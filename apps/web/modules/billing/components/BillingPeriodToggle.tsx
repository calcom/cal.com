import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@coss/ui/components/badge";
import { Toggle, ToggleGroup } from "@coss/ui/components/toggle-group";
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
      className={compact ? "rounded-md bg-muted p-0.5" : "rounded-lg bg-muted p-1"}
      size="sm"
    >
      <Toggle
        value="monthly"
        className={compact
          ? "ml-0.5 rounded-[5px] px-2 py-1 text-xs data-pressed:bg-default data-pressed:shadow-sm"
          : "ml-1 rounded-md data-pressed:bg-default data-pressed:shadow-sm"}
      >
        {t("monthly")}
      </Toggle>
      <Toggle
        value="annual"
        className={compact
          ? "gap-1 rounded-[5px] px-2 py-1 text-xs data-pressed:bg-default data-pressed:shadow-sm"
          : "gap-1 rounded-md data-pressed:bg-default data-pressed:shadow-sm"}
      >
        {t("upgrade_billing_annual")}
        <Badge variant="info" size="sm" className={compact ? "text-[10px] px-1 py-0" : ""}>
          {t("discount_25")}
        </Badge>
      </Toggle>
    </ToggleGroup>
  );
}
