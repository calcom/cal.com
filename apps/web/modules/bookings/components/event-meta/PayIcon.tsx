import { CreditCardIcon, ZapIcon } from "lucide-react";

export function PayIcon(props: { currency: string; className?: string }) {
  const { className, currency } = props;
  return currency !== "BTC" ? (
    <CreditCardIcon className={className} />
  ) : (
    <ZapIcon className={className} />
  );
}
