import React from "react";

import { SVGComponent } from "@lib/types/SVGComponent";

interface LinkIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  Icon: SVGComponent;
}

export default function LinkIconButton(props: LinkIconButtonProps) {
  return (
    <div className="-ml-2">
      <button
        {...props}
        type="button"
        className="flex items-center px-2 py-1 text-sm font-medium text-gray-700 rounded-sm text-md hover:text-gray-900 hover:bg-gray-200">
        <props.Icon className="w-4 h-4 mr-2 text-neutral-500" />
        {props.children}
      </button>
    </div>
  );
}
