import type { JSX } from "react";

import { Icon } from "@calcom/ui/components/icon";

export function PayIcon(props: { currency: string; className?: string }): JSX.Element {
  const { className, currency } = props;
  const iconName = currency !== "BTC" ? "credit-card" : "zap";
  return <Icon name={iconName} className={className} />;
}
