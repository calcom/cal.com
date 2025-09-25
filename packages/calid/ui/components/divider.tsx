import { cn } from "@calid/features/lib/cn";

export function Divider({ className, ...props }: JSX.IntrinsicElements["hr"]) {
  className = cn("border-subtle my-1", className);
  return <hr className={className} {...props} />;
}

export function VerticalDivider({ className, ...props }: JSX.IntrinsicElements["svg"]) {
  className = cn("mx-2 text-muted", className);
  return (
    <svg
      className={className}
      {...props}
      width="1.5"
      height="16"
      viewBox="0 0 2 16"
      ry="6"
      fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <rect width="2" height="16" rx="1" fill="currentColor" />
    </svg>
  );
}
