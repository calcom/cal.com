import { CreditCard, Zap } from "@calcom/ui/components/icon";

export function getPayIcon(currency: string): React.FC<{ className?: string }> {
  return currency !== "BTC" ? CreditCard : Zap;
}
