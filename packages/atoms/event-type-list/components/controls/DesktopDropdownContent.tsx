import { Button } from "@/components/ui/button";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { EventTypeGroup } from "event-type-list";
import { Copy, Code, Trash } from "lucide-react";

import { EventTypeEmbedButton } from "@calcom/features/embed/EventTypeEmbed";

type DesktopDropdownContentProps = {
  group: EventTypeGroup;
  embedLink: string;
  isReadOnly: boolean;
  isManagedEventType: boolean;
  isChildrenManagedEventType: boolean;
  id: number;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

export function DesktopDropdownContent({
  group,
  embedLink,
  isReadOnly,
  id,
  isManagedEventType,
  isChildrenManagedEventType,
  onEdit,
  onDuplicate,
  onDelete,
}: DesktopDropdownContentProps) {
  return (
    <>
      {!isReadOnly && (
        <DropdownMenuItem>
          <Button type="button" data-testid={`event-type-edit-${id}`} onClick={onEdit}>
            Edit
          </Button>
        </DropdownMenuItem>
      )}
      {!isManagedEventType && !isChildrenManagedEventType && (
        <DropdownMenuItem className="outline-none">
          <Button type="button" data-testid={`event-type-duplicate-${id}`} onClick={onDuplicate}>
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
              <Button variant="destructive" onClick={onDelete} className="w-full rounded-none">
                <Trash /> Delete
              </Button>
            </DropdownMenuItem>
          </>
        )}
    </>
  );
}
