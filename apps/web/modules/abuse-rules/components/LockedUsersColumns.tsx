"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";

import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";

export type LockedUserRow = {
  id: number;
  email: string;
  username: string | null;
  name: string | null;
  score: number;
  lockedAt: Date | null | undefined;
  lockedReason: string | null | undefined;
};

interface UseLockedUsersColumnsProps {
  t: (key: string) => string;
  onUnlock: (user: LockedUserRow) => void;
}

const REASON_LABELS: Record<string, string> = {
  score_threshold: "Score threshold",
  auto_lock_rule: "Auto-lock rule",
};

function formatReason(reason: string | null | undefined): string {
  if (!reason) return "-";
  return REASON_LABELS[reason] ?? reason;
}

export function useLockedUsersColumns({ t, onUnlock }: UseLockedUsersColumnsProps) {
  return useMemo<ColumnDef<LockedUserRow>[]>(
    () => [
      {
        id: "user",
        header: t("user"),
        size: 250,
        cell: ({ row }) => {
          const { name, username, email } = row.original;
          const displayName = name || username || email;
          return (
            <div>
              <div className="text-emphasis text-sm font-medium leading-none">{displayName}</div>
              <div className="text-subtle mt-1 text-sm leading-none">{email}</div>
            </div>
          );
        },
      },
      {
        id: "score",
        header: t("score"),
        size: 80,
        cell: ({ row }) => (
          <Badge variant="red" className="font-mono">
            {row.original.score}
          </Badge>
        ),
      },
      {
        id: "lockedReason",
        header: t("reason"),
        cell: ({ row }) => (
          <span className="text-subtle text-sm">{formatReason(row.original.lockedReason)}</span>
        ),
      },
      {
        id: "lockedAt",
        header: t("locked_at"),
        size: 100,
        cell: ({ row }) => (
          <span className="text-subtle text-sm">
            {row.original.lockedAt ? new Date(row.original.lockedAt).toLocaleDateString() : "-"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        size: 80,
        minSize: 80,
        maxSize: 80,
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end">
            <Button color="secondary" size="sm" onClick={() => onUnlock(row.original)}>
              {t("unlock")}
            </Button>
          </div>
        ),
      },
    ],
    [t, onUnlock]
  );
}
