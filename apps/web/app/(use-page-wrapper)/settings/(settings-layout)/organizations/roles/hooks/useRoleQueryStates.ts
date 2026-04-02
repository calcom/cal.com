"use client";

import { useQueryState } from "nuqs";
import { roleParsers } from "../_components/searchParams";

export function useRoleSheetState(initialOpen?: boolean) {
  const [isOpen, setIsOpen] = useQueryState("role-sheet", roleParsers["role-sheet"]);

  return {
    isOpen,
    setIsOpen,
  };
}

export function useSelectedRoleState(initialRoleId?: string) {
  const [selectedRoleId, setSelectedRoleId] = useQueryState("role", roleParsers.role);

  return {
    selectedRoleId,
    setSelectedRoleId,
  };
}

export function useRoleStates(initialOpen?: boolean, initialRoleId?: string) {
  const { isOpen, setIsOpen } = useRoleSheetState(initialOpen);
  const { selectedRoleId, setSelectedRoleId } = useSelectedRoleState(initialRoleId);

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
