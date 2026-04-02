import classNames from "@calcom/ui/classNames";
import React from "react";

type Props = { children: React.ReactNode; combined?: boolean; containerProps?: JSX.IntrinsicElements["div"] };

const sizeToRadius = {
  lg: "12px",
  base: "8px",
  sm: "10px",
  xs: "8px",
} as const;

export function ButtonGroup({ children, combined = false, containerProps }: Props) {
  // Get the size from the first button child if it exists
  const firstButton = React.Children.toArray(children)[0] as React.ReactElement;
  const size = firstButton?.props?.size || "base";
  const radius = sizeToRadius[size as keyof typeof sizeToRadius];

  const style = combined ? ({ "--btn-group-radius": radius } as React.CSSProperties) : undefined;

  return (
    <div
      {...containerProps}
      style={style}
      className={classNames(
        "flex",
        !combined
          ? "space-x-2 rtl:space-x-reverse"
          : "[&>*:first-child]:rounded-l-(--btn-group-radius) rtl:[&>*:first-child]:rounded-l-none rtl:[&>*:first-child]:rounded-r-(--btn-group-radius) [&>*:last-child]:rounded-r-(--btn-group-radius) rtl:[&>*:last-child]:rounded-l-(--btn-group-radius) rtl:[&>*:last-child]:rounded-r-none [&>*:not(:first-child)]:-ml-px *:rounded-none *:border hover:*:z-1",
        containerProps?.className
      )}>
      {children}
    </div>
  );
}
