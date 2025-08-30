import { type SVGProps } from "react";

import cn from "@calcom/ui/classNames";

import type { IconName } from "./icon-names";

function Icon({
  name,
  size = 16,
  className,
  ...props
}: SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number | string;
}) {
  return (
    <svg
      height={size}
      width={size}
      // Fill are inherited so we transparent by default. Can be overridden tailwind.
      className={cn("fill-transparent", className)}
      {...props}
      aria-hidden>
      <use href={`#${name}`} />
    </svg>
  );
}
export { IconName, Icon };
export default Icon;
