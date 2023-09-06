import type { ReactNode } from "react";

import { classNames } from "@calcom/lib";

const SectionBottomActions = ({
  align = "start",
  children,
}: {
  align?: "start" | "end";
  children: ReactNode;
}) => {
  return (
    <div
      className={classNames(
        "border-subtle bg-muted flex rounded-b-xl border px-6 py-4",
        align === "end" && "justify-end"
      )}>
      {children}
    </div>
  );
};

export default SectionBottomActions;
