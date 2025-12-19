import { CreditCardIcon } from "lucide-react";

import { SatSymbol } from "@calcom/ui/components/icon/SatSymbol";

export function PriceIcon(props: { currency: string; className?: string }) {
  const { className, currency } = props;
  if (currency !== "BTC") return <CreditCardIcon className={className} />;
  return <SatSymbol className={className} />;
}
