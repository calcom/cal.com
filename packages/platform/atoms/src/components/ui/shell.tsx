import type { LayoutProps } from "@calcom/web/modules/shell/Shell";
import { cn } from "../../lib/utils";

export const Shell = (props: LayoutProps) => {
  return (
    <div className={cn(props.headerClassName, "flex flex-col px-10 py-4")}>
      <div className="mb-6 flex items-center justify-between md:mb-6 md:mt-0 lg:mb-8">
        <div className="flex flex-col gap-0.5">
          <div>{props.heading}</div>
          <div className="text-default text-sm">{props.subtitle}</div>
        </div>
        <div>{props.CTA}</div>
      </div>
      <div>{props.children}</div>
    </div>
  );
};
