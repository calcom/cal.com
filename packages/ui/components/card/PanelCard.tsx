import type { ReactNode } from "react";

import { Button } from "@calcom/ui/components/button";

export function PanelCard({
  title,
  subtitle,
  cta,
  headerContent,
  children,
}: {
  title: string | ReactNode;
  subtitle?: string;
  cta?: { label: string; onClick: () => void };
  headerContent?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="bg-muted group relative flex w-full flex-col items-center rounded-2xl px-1 pb-1">
      <div className="flex h-11 w-full shrink-0 items-center justify-between gap-2 px-4">
        {typeof title === "string" ? (
          <h2 className="text-emphasis mr-4 shrink-0 text-sm font-semibold">{title}</h2>
        ) : (
          title
        )}
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
          {headerContent}
          {cta && (
            <Button className="shrink-0" color="secondary" onClick={cta.onClick}>
              {cta.label}
            </Button>
          )}
        </div>
      </div>
      <div className="bg-default border-muted w-full grow gap-3 rounded-xl border">
        {subtitle && (
          <h3 className="text-subtle border-muted border-b p-3 text-sm font-medium leading-none">
            {subtitle}
          </h3>
        )}
        {children}
      </div>
    </div>
  );
}
