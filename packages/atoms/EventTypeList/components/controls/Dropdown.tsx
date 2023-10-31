import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Copy, Code, Trash } from "lucide-react";

import { EventTypeEmbedButton } from "@calcom/features/embed/EventTypeEmbed";

export function EventTypeDropdown({
  group,
  isReadOnly,
  id,
  isManagedEventType,
  isChildrenManagedEventType,
  embedLink,
  onEdit,
  onDuplicate,
}: {
  group: any;
  isReadOnly: boolean;
  isManagedEventType: boolean;
  isChildrenManagedEventType: boolean;
  id: any;
  embedLink: string;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            className="bg-secondary text-secondary ltr:radix-state-open:rounded-r-md rtl:radix-state-open:rounded-l-md">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {!isReadOnly && (
            <DropdownMenuItem>
              <Button
                type="button"
                data-testid={`event-type-edit-${id}`}
                onClick={() => {
                  onEdit(id);
                }}>
                Edit
              </Button>
            </DropdownMenuItem>
          )}
          {!isManagedEventType && !isChildrenManagedEventType && (
            <DropdownMenuItem className="outline-none">
              <Button
                type="button"
                data-testid={`event-type-duplicate-${id}`}
                onClick={() => {
                  onDuplicate(id);
                }}>
                <Copy />
                Duplicate
              </Button>
            </DropdownMenuItem>
          )}
          {!isManagedEventType && (
            <DropdownMenuItem>
              <EventTypeEmbedButton
                className="w-full rounded-none"
                eventId={id}
                type="button"
                StartIcon={Code}
                embedUrl={encodeURIComponent(embedLink)}>
                Embed
              </EventTypeEmbedButton>
            </DropdownMenuItem>
          )}
          {(group.metadata?.readOnly === false || group.metadata.readOnly === null) &&
            !isChildrenManagedEventType && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      // Add appropriate handler for destruction
                    }}
                    className="w-full rounded-none">
                    <Trash /> Delete
                  </Button>
                </DropdownMenuItem>
              </>
            )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
