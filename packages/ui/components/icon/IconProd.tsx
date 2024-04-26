"use client";

// find all lucide icons at https://lucide.dev/
// github https://github.com/lucide-icons/lucide
import type { LucideProps } from "lucide-react";
import { memo } from "react";

import { dynamicIconImports } from "./dynamicIconImports";

export type IconName = keyof typeof dynamicIconImports;

interface IconProps extends Omit<LucideProps, "ref"> {
  name: IconName;
}

const fallback = <div className="bg-emphasis h-4 w-4 animate-pulse rounded-lg" />;

const LazyIcon = memo(({ name, ...props }: IconProps) => {
  const LucideIcon = dynamicIconImports[name];

  // This should never happen, but just in case
  if (!LucideIcon) return fallback;

  // @ts-expect-error - LucideIcon is a lazy loaded component
  return <LucideIcon {...props} />;
});

LazyIcon.displayName = "LazyIcon";

export default LazyIcon;
