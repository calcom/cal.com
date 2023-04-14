import React from "react";

import type { SVGComponent } from "@calcom/types/SVGComponent";

interface LinkIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  Icon: SVGComponent;
}

export default function LinkIconButton(props: LinkIconButtonProps) {
  return (
    <div className="-ml-2">
      <button
        type="button"
        {...props}
        className="text-md hover:bg-emphasis hover:text-emphasis text-default flex items-center rounded-md px-2 py-1 text-sm font-medium">
        <props.Icon className="text-subtle h-4 w-4 ltr:mr-2 rtl:ml-2" />
        {props.children}
      </button>
    </div>
  );
}
