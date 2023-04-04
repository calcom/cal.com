import { classNames } from "@calcom/lib";

export function Divider({ className, ...props }: JSX.IntrinsicElements["hr"]) {
  className = classNames("border-subtle", className);
  return <hr className={className} {...props} />;
}

export function VerticalDivider({ className, ...props }: JSX.IntrinsicElements["svg"]) {
  className = classNames("mx-3 text-muted", className);
  return (
    <svg
      className={className}
      {...props}
      width="2"
      height="16"
      viewBox="0 0 2 16"
      ry="6"
      fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <rect width="2" height="16" rx="1" fill="currentColor" />
    </svg>
  );
}
