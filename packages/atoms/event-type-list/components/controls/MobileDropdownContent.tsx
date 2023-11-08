import { Button } from "@/components/ui/button";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import type { EventTypeGroup } from "event-type-list";
import { ExternalLink, Upload, Edit, Copy, Trash } from "lucide-react";

import { Skeleton, Label } from "@calcom/ui";

type MobileDropdownContentProps = {
  group: EventTypeGroup;
  isManagedEventType: boolean;
  isChildrenManagedEventType: boolean;
  isNativeShare: boolean;
  isHidden: boolean;
  readOnly: boolean;
  id: number;
  onPreview: () => void;
  onCopy: () => void;
  onShare: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMutate: () => void;
};

export function MobileDropdownContent({
  group,
  isManagedEventType,
  isChildrenManagedEventType,
  isNativeShare,
  isHidden,
  readOnly,
  id,
  onPreview,
  onCopy,
  onShare,
  onEdit,
  onDuplicate,
  onDelete,
  onMutate,
}: MobileDropdownContentProps) {
  return (
    <>
      {isManagedEventType && (
        <>
          <DropdownMenuItem className="outline-none">
            <Button
              onClick={onPreview}
              data-testid="preview-link-button"
              type="button"
              className="w-full rounded-none">
              <ExternalLink />
              Preview
            </Button>
          </DropdownMenuItem>
          <DropdownMenuItem className="outline-none">
            <Button
              data-testid={`event-type-duplicate-${id}`}
              type="button"
              className="w-full rounded-none text-left"
              onClick={onCopy}>
              Copy link to event
            </Button>
          </DropdownMenuItem>
        </>
      )}
      {isNativeShare ? (
        <DropdownMenuItem className="outline-none">
          <Button
            data-testid={`event-type-duplicate-${id}`}
            type="button"
            className="w-full rounded-none"
            onClick={onShare}>
            <Upload /> Share
          </Button>
        </DropdownMenuItem>
      ) : null}
      {readOnly && (
        <DropdownMenuItem className="outline-none">
          <Button type="button" className="w-full rounded-none" onClick={onEdit}>
            <Edit /> Edit
          </Button>
        </DropdownMenuItem>
      )}
      {!isManagedEventType && !isChildrenManagedEventType && (
        <DropdownMenuItem className="outline-none">
          <Button data-testid={`event-type-duplicate-${id}`} onClick={onDuplicate}>
            <Copy />
            Duplicate
          </Button>
        </DropdownMenuItem>
      )}
      {(group.metadata?.readOnly === false || group.metadata.readOnly === null) &&
        !isChildrenManagedEventType && (
          <>
            <DropdownMenuItem className="outline-none">
              <Button variant="destructive" className="w-full rounded-none" onClick={onDelete}>
                <Trash /> Delete
              </Button>
            </DropdownMenuItem>
          </>
        )}
      <DropdownMenuSeparator />
      {!isManagedEventType && (
        <div className="hover:bg-subtle flex h-9 cursor-pointer flex-row items-center justify-between px-4 py-2">
          <Skeleton
            as={Label}
            htmlFor="hiddenSwitch"
            className="mt-2 inline cursor-pointer self-center pr-2 ">
            {isHidden ? "Show on profile" : "Hide from profile"}
          </Skeleton>
          <Switch id="hiddenSwitch" name="Hidden" checked={isHidden} onCheckedChange={onMutate} />
        </div>
      )}
    </>
  );
}
