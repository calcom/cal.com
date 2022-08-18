import { classNames } from "@calcom/lib";

export default function Divider({ className, ...props }) {
  className = classNames(className, "gray-200");
  return <hr className={className} {...props} />;
}
