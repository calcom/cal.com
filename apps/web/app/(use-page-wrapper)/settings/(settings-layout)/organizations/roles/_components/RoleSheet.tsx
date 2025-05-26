"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@calcom/ui/components/sheet";

type Role = {
  id: string;
  name: string;
  description?: string;
  teamId?: number;
  createdAt: Date;
  updatedAt: Date;
  type: "SYSTEM" | "CUSTOM";
  permissions: {
    id: string;
    resource: string;
    action: string;
  }[];
};

interface RoleSheetProps {
  role?: Role;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoleSheet({ role, open, onOpenChange }: RoleSheetProps) {
  const isEditing = Boolean(role);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Role" : "Create Role"}</SheetTitle>
        </SheetHeader>
        {/* Add your form content here */}
      </SheetContent>
    </Sheet>
  );
}
