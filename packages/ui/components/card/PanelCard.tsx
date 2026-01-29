"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { ReactNode } from "react";
import { useId, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
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
  ...dataAttributes
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
} & Record<`data-${string}`, string | undefined>) {
  const { t } = useLocale();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const contentId = useId();
  const titleId = useId();
  const [animationParent] = useAutoAnimate<HTMLDivElement>();

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  const isStringTitle = typeof title === "string";

  return (
    <div
      data-testid="panel-card"
      ref={animationParent}
      className={classNames(
        "bg-cal-muted group relative flex w-full flex-col items-center rounded-2xl px-1",
        !isCollapsed && "pb-1",
        className
      )}
      {...dataAttributes}>
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
              aria-expanded={!isCollapsed}
              aria-controls={contentId}
              aria-label={isCollapsed ? t("expand_panel") : t("collapse_panel")}
            />
          )}
          {isStringTitle ? (
            <div className="mr-4 flex shrink-0 items-center gap-1">
              <h2 id={titleId} className="text-emphasis shrink-0 text-sm font-semibold">
                {collapsible ? (
                  <button
                    type="button"
                    onClick={toggleCollapse}
                    className="text-left transition-opacity hover:opacity-80"
                    aria-expanded={!isCollapsed}
                    aria-controls={contentId}
                    aria-label={isCollapsed ? t("expand_panel") : t("collapse_panel")}>
                    {title as string}
                  </button>
                ) : (
                  (title as string)
                )}
              </h2>
              {titleTooltip && <InfoBadge content={titleTooltip} />}
            </div>
          ) : (
            title
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
      {!(isCollapsed && collapsible) && (
        <div
          id={contentId}
          role="region"
          aria-labelledby={isStringTitle ? titleId : undefined}
          className="bg-default border-muted w-full grow gap-3 rounded-xl border">
          {subtitle && (
            <h3 className="text-subtle border-muted border-b p-3 text-sm font-medium leading-none">
              {subtitle}
            </h3>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
