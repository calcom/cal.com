// find all lucide icons at https://lucide.dev/
// github https://github.com/lucide-icons/lucide
import type { LucideProps } from "lucide-react";
import { memo } from "react";

import IconDev from "./IconDev";
import type { IconName } from "./dynamicIconImports";

interface IconProps extends Omit<LucideProps, "ref"> {
  name: IconName;
}

const Icon = memo((props: IconProps) => <IconDev {...props} />);

Icon.displayName = "Icon";

export default Icon;
