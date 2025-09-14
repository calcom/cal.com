import { Button } from "@calid/features/ui/components/button";
import { Icon } from "@calid/features/ui/components/icon";
import { AnimatePresence, m } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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
  onClose 
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
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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
          className="fixed left-0 top-0 z-50 h-full w-80 bg-white dark:bg-muted border-r border-subtle shadow-lg md:block hidden"
          onMouseLeave={onClose}
        >
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-subtle p-3.5">
              <h2 className="text-md font-semibold text-default">
                {t("available_meeting_types")}
              </h2>
              <Button
                variant="icon"
                color="secondary"
                size="sm"
                onClick={onClose}
                className="h-8 w-8"
              >
              </Button>
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
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-subtle hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <div className="rounded-md bg-muted p-2">
                            <Icon
                              name={iconParams.icon as any}
                              className="h-5 w-5"
                              style={{ color: iconParams.color }}
                            />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-default truncate">
                            {eventType.title}
                          </h3>
                          {eventType.description && (
                            <p className="mt-1 text-sm text-subtle line-clamp-2">
                              {eventType.description}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-2 text-xs text-subtle">
                            <Icon name="clock" className="h-3 w-3" />
                            <span>{eventType.length}m</span>
                            {isCurrentEvent && (
                              <span className="ml-auto rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">
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
