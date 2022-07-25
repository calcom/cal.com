import React from "react";

export default function BaseIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      aria-hidden="true"
      height="24"
      viewBox="0 0 16 16"
      version="1.1"
      width="24"
      data-view-component="true"
      {...props}>
      {props.children}
    </svg>
  );
}
