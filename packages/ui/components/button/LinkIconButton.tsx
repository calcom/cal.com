import type { LucideIcon } from "lucide-react";
import React from "react";

interface LinkIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  Icon: LucideIcon;
}

export default function LinkIconButton(props: LinkIconButtonProps) {
  const { Icon: IconComponent, ...restProps } = props;
  return (
    <div className="-ml-2">
      <button
        type="button"
        {...restProps}
        className="text-md hover:bg-emphasis hover:text-emphasis text-default flex items-center rounded-md px-2 py-1 text-sm font-medium">
        <IconComponent className="text-subtle h-4 w-4 ltr:mr-2 rtl:ml-2" />
        {props.children}
      </button>
    </div>
  );
}
