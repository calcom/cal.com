"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import classNames from "@calcom/ui/classNames";
import { InfoBadge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";

export function PanelCard({
  title,
  subtitle,
  cta,
  headerContent,
  className,
  titleTooltip,
  children,
  collapsible = false,
  defaultCollapsed = false,
}: {
  title: string | ReactNode;
  subtitle?: string;
  cta?: { label: string; onClick: () => void };
  headerContent?: ReactNode;
  className?: string;
  titleTooltip?: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  const titleContent =
    typeof title === "string" ? (
      <div className="mr-4 flex shrink-0 items-center gap-1">
        <h2 className="text-emphasis shrink-0 text-sm font-semibold">{title}</h2>
        {titleTooltip && <InfoBadge content={titleTooltip} />}
      </div>
    ) : (
      title
    );

  return (
    <div
      className={classNames(
        "bg-muted group relative flex w-full flex-col items-center rounded-2xl px-1",
        !isCollapsed && "pb-1",
        className
      )}>
      <div className="flex h-11 w-full shrink-0 items-center justify-between gap-2 px-4">
        <div className="flex shrink-0 items-center gap-1">
          {collapsible && (
            <Button
              size="sm"
              variant="icon"
              color="minimal"
              CustomStartIcon={
                <Icon
                  name="chevron-up"
                  className={classNames(
                    "text-default h-4 w-4 transition-transform",
                    isCollapsed && "rotate-180"
                  )}
                />
              }
              onClick={toggleCollapse}
              className="text-muted -ml-2"
            />
          )}
          {collapsible && typeof title === "string" ? (
            <button onClick={toggleCollapse} className="text-left transition-opacity hover:opacity-80">
              {titleContent}
            </button>
          ) : (
            titleContent
          )}
        </div>
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
          {headerContent}
          {cta && (
            <Button className="shrink-0" color="secondary" onClick={cta.onClick}>
              {cta.label}
            </Button>
          )}
        </div>
      </div>
      <div
        className={classNames(
          "bg-default border-muted w-full grow gap-3 rounded-xl border",
          isCollapsed && collapsible && "hidden"
        )}>
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
