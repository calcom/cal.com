import { CreditCard, Zap } from "lucide-react";

import type { LucideIcon } from "@calcom/ui/components/icon";

export function getPayIcon(currency: string): React.FC<{ className: string }> | string | LucideIcon {
  return currency !== "BTC" ? CreditCard : Zap;
}
