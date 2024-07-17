// find all lucide icons at https://lucide.dev/
// github https://github.com/lucide-icons/lucide
import type { LucideProps } from "lucide-react";
import dynamic from "next/dynamic";
import { memo } from "react";

import type { IconName } from "./dynamicIconImports";

interface IconProps extends Omit<LucideProps, "ref"> {
  name: IconName;
}

const IconLazy = dynamic(
  // Fast refresh doesn't play nice with dynamic imports
  // This prevent slowdowns in development mode
  process.env.NODE_ENV === "production" ? () => import("./IconProd") : () => import("./IconDev")
);

const Icon = memo((props: IconProps) => <IconLazy {...props} />);

Icon.displayName = "Icon";

export default Icon;
