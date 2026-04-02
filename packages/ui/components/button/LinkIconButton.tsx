import type React from "react";
import type { IconName } from "../icon";
import { Icon } from "../icon";

interface LinkIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  Icon: IconName;
}

export default function LinkIconButton(props: LinkIconButtonProps) {
  return (
    <div className="-ml-2">
      <button
        type="button"
        {...props}
        className="text-md hover:bg-emphasis hover:text-emphasis text-default flex items-center rounded-md px-2 py-1 text-sm font-medium">
        <Icon name={props.Icon} className="text-subtle h-4 w-4 ltr:mr-2 rtl:ml-2" />
        {props.children}
      </button>
    </div>
  );
}
