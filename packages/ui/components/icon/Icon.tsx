// find all lucide icons at https://lucide.dev/
// github https://github.com/lucide-icons/lucide
import type { LucideProps } from "lucide-react";
import dynamic from "next/dynamic";
import { memo } from "react";

import type { IconName } from "./dynamicIconImports";

interface IconProps extends Omit<LucideProps, "ref"> {
  name: IconName;
}

const IconDev = dynamic(() => import("./IconDev"));
const IconProd = dynamic(() => import("./IconProd"));

const Icon = memo((props: IconProps) => {
  // Fast refresh doesn't play nice with dynamic imports
  // This prevent slowdowns in development mode
  if (process.env.NODE_ENV === "development") return <IconDev {...props} />;
  return <IconProd {...props} />;
});

Icon.displayName = "Icon";

export default Icon;
