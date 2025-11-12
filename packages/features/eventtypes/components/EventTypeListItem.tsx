"use client";

import Link from "next/link";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { AtomEventTypeListItem } from "@calcom/platform/atoms/event-types/types/atom-event-type-list.type";
import { Button } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { showToast } from "@calcom/ui/components/toast";

export function EventTypeListItem({
  eventType,
  deleteFunction,
  isDeletable = true,
  getEventTypeUrl,
}: {
  eventType: AtomEventTypeListItem;
  deleteFunction: ({ eventTypeId }: { eventTypeId: number }) => void;
  isDeletable?: boolean;
  getEventTypeUrl?: (eventTypeId: number) => string;
}) {
  const { t } = useLocale();

  const content = (
    <div>
      <div className="space-x-2 rtl:space-x-reverse">
        <span className="text-emphasis truncate font-medium">{eventType.title}</span>
      </div>
      <p className="text-subtle mt-1">
        {eventType.description && (
          <>
            {eventType.description}
            <br />
          </>
        )}
        <span className="text-xs">{eventType.length} min</span>
      </p>
    </div>
  );

  return (
    <li key={eventType.id}>
      <div className="hover:bg-muted flex items-center justify-between px-3 py-5 transition sm:px-4">
        <div className="group flex w-full items-center justify-between">
          {getEventTypeUrl ? (
            <Link
              href={getEventTypeUrl(eventType.id)}
              className="flex-grow truncate text-sm"
              title={eventType.title}>
              {content}
            </Link>
          ) : (
            <div className="flex-grow truncate text-sm">{content}</div>
          )}
        </div>
        <Dropdown>
          <DropdownMenuTrigger asChild>
            <Button
              data-testid={`event-type-options-${eventType.id}`}
              type="button"
              variant="icon"
              color="secondary"
              StartIcon="ellipsis"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {getEventTypeUrl && (
              <DropdownMenuItem className="min-w-40 focus:ring-muted">
                <DropdownItem type="button" StartIcon="pencil" href={getEventTypeUrl(eventType.id)}>
                  {t("edit")}
                </DropdownItem>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="min-w-40 focus:ring-muted">
              <DropdownItem
                type="button"
                color="destructive"
                StartIcon="trash"
                data-testid={`delete-event-type-${eventType.id}`}
                className="rounded-t-none"
                onClick={() => {
                  if (!isDeletable) {
                    showToast(t("cannot_delete_event_type"), "error");
                  } else {
                    if (window.confirm(t("delete_event_type_confirmation"))) {
                      deleteFunction({ eventTypeId: eventType.id });
                    }
                  }
                }}>
                {t("delete")}
              </DropdownItem>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </Dropdown>
      </div>
    </li>
  );
}