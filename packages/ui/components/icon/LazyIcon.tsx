// find all lucide icons at https://lucide.dev/
// github https://github.com/lucide-icons/lucide
import type { LucideProps } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import dynamic from "next/dynamic";

interface IconProps extends LucideProps {
  name: keyof typeof dynamicIconImports;
}

const LazyIcon = ({ name, ...props }: IconProps) => {
  const LucideIcon = dynamic(dynamicIconImports[name]);

  return <LucideIcon {...props} />;
};

export default LazyIcon;
