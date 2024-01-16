import {
  Dropdown,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownItem,
  Button,
} from "@calcom/ui";
import { MoreHorizontal, Copy, Trash } from "@calcom/ui/components/icon";

type AvailabilityDropdownProps = {
  schedule: any;
  isLoading: boolean;
  onDelete: () => void;
  onDuplicate: () => void;
};

export function AvailabilityDropdown({
  schedule,
  isLoading,
  onDelete,
  onDuplicate,
}: AvailabilityDropdownProps) {
  return (
    <Dropdown>
      <DropdownMenuTrigger asChild>
        <Button
          data-testid="schedule-more"
          className="mx-5"
          type="button"
          variant="icon"
          color="secondary"
          StartIcon={MoreHorizontal}
        />
      </DropdownMenuTrigger>
      {!isLoading && schedule && (
        <DropdownMenuContent>
          {/* TODO: set as default isnt working at the moment since that api is not ready yet */}
          {/* 
      <DropdownMenuItem className="focus:ring-muted min-w-40">
        {!schedule.isDefault && (
          <DropdownItem
            type="button"
            StartIcon={Star}
            onClick={() => {
              // set to default function goes here
            }}>
            Set as default
          </DropdownItem>
        )}
      </DropdownMenuItem> 
      */}
          <DropdownMenuItem className="outline-none">
            <DropdownItem
              type="button"
              data-testid={`schedule-duplicate${schedule.id}`}
              StartIcon={Copy}
              onClick={onDuplicate}>
              Duplicate
            </DropdownItem>
          </DropdownMenuItem>
          <DropdownMenuItem className="focus:ring-muted min-w-40">
            <DropdownItem
              type="button"
              color="destructive"
              StartIcon={Trash}
              data-testid="delete-schedule"
              onClick={onDelete}>
              Delete
            </DropdownItem>
          </DropdownMenuItem>
        </DropdownMenuContent>
      )}
    </Dropdown>
  );
}
