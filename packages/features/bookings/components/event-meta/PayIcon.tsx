import { Icon } from "@calid/features/ui/components/icon/Icon";




export function PayIcon(props: { currency: string; className?: string }) {
  const { className, currency } = props;
  return <Icon name={currency !== "BTC" ? "credit-card" : "zap"} className={className} />;
}
