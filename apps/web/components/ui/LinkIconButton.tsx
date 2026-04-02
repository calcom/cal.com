import { Icon } from "@calcom/ui/components/icon";
import type React from "react";

interface LinkIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  Icon: React.ComponentProps<typeof Icon>["name"];
}

export default function LinkIconButton(props: LinkIconButtonProps) {
  return (
    <div className="-ml-2">
      <button
        type="button"
        {...props}
        className="text-md hover:bg-emphasis hover:text-emphasis text-default flex items-center rounded-sm px-2 py-1 text-sm font-medium">
        <Icon name={props.Icon} className="text-subtle h-4 w-4 ltr:mr-2 rtl:ml-2" />
        {props.children}
      </button>
    </div>
  );
}
