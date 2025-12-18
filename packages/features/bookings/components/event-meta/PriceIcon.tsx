import { SatSymbol } from "@calcom/ui/components/icon";
import { CreditCard } from "lucide-react";

export function PriceIcon(props: { currency: string; className?: string }) {
  const { className, currency } = props;
  if (currency !== "BTC") return <CreditCard className={className} />;
  return <SatSymbol className={className} />;
}
