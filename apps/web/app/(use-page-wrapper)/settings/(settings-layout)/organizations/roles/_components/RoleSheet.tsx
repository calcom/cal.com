"use client";

import { useQueryState } from "nuqs";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@calcom/ui/components/sheet";

import { roleParsers } from "./searchParams";

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
}

export function RoleSheet({ role, open }: RoleSheetProps) {
  const isEditing = Boolean(role);
  const [isOpen, setIsOpen] = useQueryState("role-sheet", {
    ...roleParsers["role-sheet"],
    defaultValue: open ?? false,
  });

  const [, setSelectedRoleId] = useQueryState("role", {
    ...roleParsers.role,
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSelectedRoleId("");
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Role" : "Create Role"}</SheetTitle>
        </SheetHeader>
        {/* Add your form content here */}
      </SheetContent>
    </Sheet>
  );
}
