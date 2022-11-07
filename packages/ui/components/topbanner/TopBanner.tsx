import { Icon } from "react-feather";

export type TopBannerProps = {
  color?: keyof typeof variantClassName;
  StartIcon?: Icon | React.ElementType;
};

const variantClassName = {
  primary: "",
  warning: "",
  error: "",
};

export function TopBanner(props: TopBannerProps) {
  const { color = "primary" } = props;
  return <div className="absolute top-0 left-0 h-[10px]">Action</div>;
}
