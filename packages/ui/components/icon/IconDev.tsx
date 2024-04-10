// find all lucide icons at https://lucide.dev/
// github https://github.com/lucide-icons/lucide
import { icons } from "lucide-react";

import type { IconProps } from "./dynamicIconImports";

const clearAndUpper = (text: string) => text.replace(/-/, "").toUpperCase();
const toPascalCase = (text: string) => text.replace(/(^\w|-\w)/g, clearAndUpper);

const IconDev = ({ name, ...props }: IconProps) => {
  const CamelCaseName = toPascalCase(name);
  const LucideIcon = icons[CamelCaseName as keyof typeof icons];
  if (!LucideIcon) return null;
  return <LucideIcon {...props} />;
};

export default IconDev;
