import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import type { EventTypeGroup } from "event-type-list";
import { DesktopDropdownContent } from "event-type-list/components/controls/DesktopDropdownContent";
import { MobileDropdownContent } from "event-type-list/components/controls/MobileDropdownContent";
import { MoreHorizontal } from "lucide-react";

type DesktopContent = {
  variant: "desktop";
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

type MobileContent = {
  variant: "mobile";
  group: EventTypeGroup;
  isManagedEventType: boolean;
  isChildrenManagedEventType: boolean;
  isNativeShare: boolean;
  readOnly: boolean;
  id: number;
  onPreview: () => void;
  onCopy: () => void;
  onShare: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

// EventTypeDropdownProps is a discriminated union
// where discriminant is the variant prop
type EventTypeDropdownProps = DesktopContent | MobileContent;

// Two more separate components one for desktop content for dropdown and other for mobile dropdown content
export function EventTypeDropdown(props: EventTypeDropdownProps) {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild data-testid={`event-type-options-${id}`}>
          <Button
            type="button"
            className={`${
              props.variant === "desktop"
                ? "bg-secondary text-secondary ltr:radix-state-open:rounded-r-md rtl:radix-state-open:rounded-l-md"
                : "bg-secondary text-secondary"
            }`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {props.variant === "desktop" && (
            <DesktopDropdownContent
              group={props.group}
              embedLink={props.embedLink}
              isReadOnly={props.isReadOnly}
              isManagedEventType={props.isManagedEventType}
              isChildrenManagedEventType={props.isChildrenManagedEventType}
              id={props.id}
              onEdit={props.onEdit}
              onDuplicate={props.onDuplicate}
              onDelete={props.onDelete}
            />
          )}
          {props.variant === "mobile" && (
            <MobileDropdownContent
              group={props.group}
              isManagedEventType={props.isManagedEventType}
              isChildrenManagedEventType={props.isChildrenManagedEventType}
              isNativeShare={props.isNativeShare}
              readOnly={props.readOnly}
              id={props.id}
              onPreview={props.onPreview}
              onCopy={props.onCopy}
              onShare={props.onShare}
              onEdit={props.onEdit}
              onDuplicate={props.onDuplicate}
              onDelete={props.onDelete}
            />
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
