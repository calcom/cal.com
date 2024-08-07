import { type SVGProps } from "react";

import type { IconName } from "./icon-names";
import spriteHref from "./sprite.svg";

function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & {
  name: IconName;
}) {
  return (
    <svg {...props} aria-hidden>
      <use href={`${spriteHref}#${name}`} />
    </svg>
  );
}
export { IconName };
export default Icon;
