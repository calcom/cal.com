import React from "react";

import type { SVGComponent } from "@lib/types/SVGComponent";

interface LinkIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  Icon: SVGComponent;
}

export default function LinkIconButton(props: LinkIconButtonProps) {
  return (
    <div className="-ml-2">
      <button
        type="button"
        {...props}
        className="text-md flex items-center rounded-sm px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900">
        <props.Icon className="h-4 w-4 text-gray-500 ltr:mr-2 rtl:ml-2" />
        {props.children}
      </button>
    </div>
  );
}
