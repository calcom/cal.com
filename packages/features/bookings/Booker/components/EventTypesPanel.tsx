import { Button } from "@calid/features/ui/components/button";
import { Icon } from "@calid/features/ui/components/icon";
import { AnimatePresence, m } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import classNames from "@calcom/ui/classNames";

interface EventType {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
  length: number;
  metadata?: any;
}

interface EventTypesPanelProps {
  eventTypes: EventType[];
  username: string;
  currentEventSlug: string;
  isVisible: boolean;
  onClose: () => void;
}

interface IconParams {
  icon: string;
  color: string;
}

function getIconParamsFromMetadata(metadata: any): IconParams {
  const iconParams = metadata?.iconParams as IconParams;
  return iconParams || { icon: "calendar", color: "#6B7280" };
}

export function EventTypesPanel({
  eventTypes,
  username,
  currentEventSlug,
  isVisible,
  onClose,
}: EventTypesPanelProps) {
  const { t } = useLocale();
  const { user: _user, orgSlug: _orgSlug, redirect: _redirect, ...query } = useRouterQuery();
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <m.div
          ref={panelRef}
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="bg-default border-subtle fixed left-0 top-0 z-50 hidden h-full w-80 border-r shadow-lg md:block"
          onMouseLeave={onClose}>
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-subtle flex items-center justify-between border-b p-3.5">
              <h2 className="text-md text-default font-semibold">{t("available_meeting_types")}</h2>
              <Button variant="icon" color="secondary" size="sm" onClick={onClose} className="h-8 w-8" />
            </div>

            {/* Event Types List */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {eventTypes.map((eventType) => {
                  const iconParams = getIconParamsFromMetadata(eventType.metadata);
                  const isCurrentEvent = eventType.slug === currentEventSlug;

                  return (
                    <Link
                      key={eventType.id}
                      href={{
                        pathname: `/${username}/${eventType.slug}`,
                        query,
                      }}
                      className={classNames(
                        "block rounded-lg border p-4 transition-all duration-200",
                        isCurrentEvent
                          ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                          : "border-subtle hover:border-primary/50 hover:bg-muted/50"
                      )}>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <div className="bg-muted rounded-md p-2">
                            <Icon
                              name={iconParams.icon as any}
                              className="h-5 w-5"
                              style={{ color: iconParams.color }}
                            />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-default truncate font-medium">{eventType.title}</h3>
                          {eventType.description && (
                            <p className="text-subtle mt-1 line-clamp-2 text-sm">{eventType.description}</p>
                          )}
                          <div className="text-subtle mt-2 flex items-center gap-2 text-xs">
                            <Icon name="clock" className="h-3 w-3" />
                            <span>{eventType.length}m</span>
                            {isCurrentEvent && (
                              <span className="bg-primary text-primary-foreground ml-auto rounded-full px-2 py-1 text-xs">
                                {t("current")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
