// find all lucide icons at https://lucide.dev/
// github https://github.com/lucide-icons/lucide
import type { LucideProps } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import dynamic from "next/dynamic";
import { memo } from "react";

export type IconName = keyof typeof dynamicIconImports;

interface IconProps extends Omit<LucideProps, "ref"> {
  name: IconName;
}

const LazyIcon = memo(({ name, ...props }: IconProps) => {
  const LucideIcon = dynamic(dynamicIconImports[name]);

  return <LucideIcon {...props} />;
});

LazyIcon.displayName = "LazyIcon";

export default LazyIcon;
