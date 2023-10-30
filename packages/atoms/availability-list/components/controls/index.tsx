import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/toaster";
import type { Schedule } from "availability-list";
import { MoreHorizontal, Star, Copy, Trash } from "lucide-react";

type ControlsProps = {
  schedule: Schedule;
  handleDelete: () => void;
  handleDuplicate: () => void;
  handleSetDefault: () => void;
};

export function Controls({ schedule, handleDelete, handleDuplicate, handleSetDefault }: ControlsProps) {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button type="button" color="secondary" className="bg-secondary text-secondary mx-5">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {!schedule.isDefault && (
            <DropdownMenuItem
              onClick={() => {
                handleSetDefault();
              }}
              className="min-w-40 focus:ring-mute min-w-40 focus:ring-muted">
              <Star />
              Set as default
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="outline-none"
            onClick={() => {
              handleDuplicate();
            }}>
            <Copy />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem
            className="min-w-40 focus:ring-muted"
            onClick={() => {
              handleDelete();
            }}>
            <Trash />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Toaster />
    </>
  );
}
