import { classNames } from "@calcom/lib";

export default function Divider({ className, ...props }: JSX.IntrinsicElements["hr"]) {
  className = classNames(className, "gray-200");
  return <hr className={className} {...props} />;
}
