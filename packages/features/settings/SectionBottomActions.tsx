import type { ReactNode } from "react";

import classNames from "@calcom/ui/classNames";

const SectionBottomActions = ({
  align = "start",
  children,
  className,
}: {
  align?: "start" | "end";
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={classNames(
        "border-subtle bg-cal-muted flex rounded-b-lg border px-6 py-4",
        align === "end" && "justify-end",
        className
      )}>
      {children}
    </div>
  );
};

export default SectionBottomActions;
