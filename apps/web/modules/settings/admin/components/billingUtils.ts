export function dunningBadgeVariant(status: string) {
  if (status === "CURRENT") return "green" as const;
  if (status === "WARNING") return "orange" as const;
  return "red" as const;
}

export function strategyBadgeVariant(strategy: string | null) {
  switch (strategy) {
    case "HighWaterMark":
      return "blue" as const;
    case "MonthlyProration":
      return "purple" as const;
    case "ActiveUserBilling":
      return "orange" as const;
    default:
      return "gray" as const;
  }
}

export function formatStrategyName(strategy: string | null, t: (key: string) => string): string {
  switch (strategy) {
    case "HighWaterMark":
      return t("strategy_high_water_mark");
    case "MonthlyProration":
      return t("strategy_monthly_proration");
    case "ActiveUserBilling":
      return t("strategy_active_user_billing");
    case "ImmediateUpdate":
      return t("strategy_immediate_update");
    default:
      return t("not_set");
  }
}

export function formatCyclePosition(
  subscriptionStart: string | null,
  subscriptionEnd: string | null,
  billingPeriod: string | null,
  t: (key: string, opts?: Record<string, unknown>) => string
): string | null {
  if (!subscriptionStart || !subscriptionEnd) return null;
  const start = new Date(subscriptionStart);
  const end = new Date(subscriptionEnd);
  const now = new Date();

  if (billingPeriod === "MONTHLY") {
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const currentDay = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return t("day_x_of_y", { current: Math.max(1, Math.min(currentDay, totalDays)), total: totalDays });
  }

  if (billingPeriod === "ANNUALLY") {
    const monthsDiff = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    const currentMonth = Math.max(1, Math.min(monthsDiff + 1, 12));
    return t("month_x_of_y", { current: currentMonth, total: 12 });
  }

  return null;
}
