import { Icon } from "@calcom/ui/components/icon";

export function PayIcon(props: { currency: string; className?: string }) {
  const { className, currency } = props;
  return <Icon name={currency !== "BTC" ? "credit-card" : "zap"} className={className} />;
}
