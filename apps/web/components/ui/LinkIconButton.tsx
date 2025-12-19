import type { LucideIcon } from "lucide-react";
import React from "react";

interface LinkIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  Icon: LucideIcon;
}

export default function LinkIconButton(props: LinkIconButtonProps) {
  const { Icon, children, ...buttonProps } = props;
  return (
    <div className="-ml-2">
      <button
        type="button"
        {...buttonProps}
        className="text-md hover:bg-emphasis hover:text-emphasis text-default flex items-center rounded-sm px-2 py-1 text-sm font-medium">
        <Icon className="text-subtle h-4 w-4 ltr:mr-2 rtl:ml-2" />
        {children}
      </button>
    </div>
  );
}
