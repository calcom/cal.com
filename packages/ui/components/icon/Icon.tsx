import { type SVGProps } from "react";

import ExternalFallbackIcon from "./ExternalFallbackIcon";
import type { IconName as ExternalFallbackIconName } from "./dynamicIconImports";
import type { IconName } from "./icon-names";

function Icon({
  name,
  size = 16,
  ...props
}: SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number | string;
}) {
  if (!process.env.NEXT_PUBLIC_WEBAPP_URL) {
    return <ExternalFallbackIcon {...props} name={name as unknown as ExternalFallbackIconName} />;
  }

  return (
    <svg height={size} width={size} {...props} aria-hidden>
      <use href={`/icons/sprite.svg#${name}`} />
    </svg>
  );
}
export { IconName };
export default Icon;
