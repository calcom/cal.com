import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import type { EventTypeGroup } from "event-type-list";
import { DesktopDropdownContent } from "event-type-list/components/controls/DesktopDropdownContent";
import { MobileDropdownContent } from "event-type-list/components/controls/MobileDropdownContent";
import { MoreHorizontal } from "lucide-react";

type EventTypeDropdownProps = {
  // In progress: Display dropdown content based on variant
  variant: "desktop" | "mobile";
  group: EventTypeGroup;
  isReadOnly: boolean;
  isManagedEventType: boolean;
  isChildrenManagedEventType: boolean;
  id: number;
  embedLink: string;
  onEdit: (id: number) => void;
  onDuplicate: (id: number) => void;
};

// Two more separate components one for desktop content for dropdown and other for mobile dropdown content
export function EventTypeDropdown({
  variant,
  group,
  isReadOnly,
  id,
  isManagedEventType,
  isChildrenManagedEventType,
  embedLink,
  onEdit,
  onDuplicate,
}: EventTypeDropdownProps) {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild data-testid={`event-type-options-${id}`}>
          <Button
            type="button"
            className={`${
              variant === "desktop"
                ? "bg-secondary text-secondary ltr:radix-state-open:rounded-r-md rtl:radix-state-open:rounded-l-md"
                : "bg-secondary text-secondary"
            }`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {variant === "desktop" ? (
            <DesktopDropdownContent
              group={group}
              embedLink={embedLink}
              isReadOnly={isReadOnly}
              isManagedEventType={isManagedEventType}
              isChildrenManagedEventType={isChildrenManagedEventType}
              id={id}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
            />
          ) : (
            <MobileDropdownContent />
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
