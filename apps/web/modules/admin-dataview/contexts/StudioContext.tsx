"use client";

import { createContext, useCallback, useContext, useState } from "react";

import { registry } from "@calcom/features/admin-dataview/registry";
import type { AdminTable } from "@calcom/features/admin-dataview/AdminTable";

interface DetailState {
  table: AdminTable;
  row: Record<string, unknown>;
}

interface StudioContextValue {
  detail: DetailState | null;
  dialogOpen: boolean;
  pinned: boolean;
  openDetail: (tableSlug: string, row: Record<string, unknown>) => void;
  pin: () => void;
  unpin: () => void;
  close: () => void;
  setDialogOpen: (open: boolean) => void;
}

const StudioContext = createContext<StudioContextValue | null>(null);

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pinned, setPinned] = useState(false);

  const openDetail = useCallback(
    (tableSlug: string, row: Record<string, unknown>) => {
      const table = registry.getBySlug(tableSlug);
      if (!table) return;
      setDetail({ table, row });
      if (!pinned) {
        setDialogOpen(true);
      }
    },
    [pinned]
  );

  const pin = useCallback(() => {
    setPinned(true);
    setDialogOpen(false);
  }, []);

  const unpin = useCallback(() => {
    setPinned(false);
    if (detail) setDialogOpen(true);
  }, [detail]);

  const close = useCallback(() => {
    setDialogOpen(false);
    setDetail(null);
    setPinned(false);
  }, []);

  return (
    <StudioContext.Provider
      value={{ detail, dialogOpen, pinned, openDetail, pin, unpin, close, setDialogOpen }}>
      {children}
    </StudioContext.Provider>
  );
}

export function useStudio() {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio must be used within StudioProvider");
  return ctx;
}
