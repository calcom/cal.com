import { CreditCardIcon, ZapIcon } from "@coss/ui/icons";

export function PayIcon(props: { currency: string; className?: string }) {
  const { className, currency } = props;
  return currency !== "BTC" ? <CreditCardIcon className={className} /> : <ZapIcon className={className} />;
}
