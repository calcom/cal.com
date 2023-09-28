import { CreditCard, Zap } from "lucide-react";

export function getPayIcon(currency: string): React.FC<{ className: string }> | string {
  return currency !== "BTC" ? CreditCard : Zap;
}
