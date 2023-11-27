import { CreditCard } from "lucide-react";

import { SatSymbol } from "@calcom/ui/components/icon/SatSymbol";

export function getPriceIcon(currency: string): React.FC<{ className: string }> | string {
  return currency !== "BTC" ? CreditCard : (SatSymbol as React.FC<{ className: string }>);
}
