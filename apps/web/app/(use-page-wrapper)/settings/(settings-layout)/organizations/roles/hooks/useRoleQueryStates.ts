"use client";

import { useQueryState } from "nuqs";

import { roleParsers } from "../_components/searchParams";

export function useRoleSheetState() {
  const [isOpen, setIsOpen] = useQueryState("role-sheet", roleParsers["role-sheet"]);

  return {
    isOpen,
    setIsOpen,
  };
}

export function useSelectedRoleState() {
  const [selectedRoleId, setSelectedRoleId] = useQueryState("role", roleParsers.role);

  return {
    selectedRoleId,
    setSelectedRoleId,
  };
}

export function useRoleStates() {
  const { isOpen, setIsOpen } = useRoleSheetState();
  const { selectedRoleId, setSelectedRoleId } = useSelectedRoleState();

  const handleSheetOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSelectedRoleId("");
    }
  };

  return {
    isOpen,
    setIsOpen,
    selectedRoleId,
    setSelectedRoleId,
    handleSheetOpenChange,
  };
}
