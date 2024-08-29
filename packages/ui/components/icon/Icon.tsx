import { type SVGProps } from "react";

import type { IconName } from "./icon-names";

function Icon({
  name,
  size = 16,
  ...props
}: SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number | string;
}) {
  return (
    <svg height={size} width={size} {...props} aria-hidden>
      <use href={`#${name}`} />
    </svg>
  );
}
export { IconName };
export default Icon;
