import { SatSymbol } from "@calcom/ui/components/icon";
import { CreditCardIcon } from "@coss/ui/icons";

export function PriceIcon(props: { currency: string; className?: string }) {
  const { className, currency } = props;
  if (currency !== "BTC") return <CreditCardIcon className={className} />;
  return <SatSymbol className={className} />;
}
