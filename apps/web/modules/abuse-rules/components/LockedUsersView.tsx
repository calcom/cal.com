"use client";

import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { keepPreviousData } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { useLocale } from "@calcom/i18n/useLocale";
import { trpc } from "@calcom/trpc/react";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui/components/dialog";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { showToast } from "@calcom/ui/components/toast";
import { DataTableToolbar, DataTableWrapper } from "@calcom/web/modules/data-table/components";
import { DataTableProvider } from "~/data-table/DataTableProvider";
import { useDataTable } from "~/data-table/hooks/useDataTable";

import type { LockedUserRow } from "./LockedUsersColumns";
import { useLockedUsersColumns } from "./LockedUsersColumns";

function LockedUsersContent() {
  const { t } = useLocale();
  const { limit, offset, searchTerm } = useDataTable();
  const utils = trpc.useUtils();

  const [userToUnlock, setUserToUnlock] = useState<LockedUserRow | null>(null);

  const { data, isPending } = trpc.viewer.admin.abuseScoring.lockedUsers.list.useQuery(
    { limit, offset, searchTerm },
    { placeholderData: keepPreviousData }
  );

  const unlockUser = trpc.viewer.admin.abuseScoring.lockedUsers.unlock.useMutation({
    onSuccess: async () => {
      await utils.viewer.admin.abuseScoring.lockedUsers.list.invalidate();
      showToast(t("user_unlocked"), "success");
      setUserToUnlock(null);
    },
    onError: (error) => showToast(error.message, "error"),
  });

  const columns = useLockedUsersColumns({ t, onUnlock: setUserToUnlock });

  const flatData = useMemo(() => data?.rows ?? [], [data]);
  const totalRowCount = data?.meta?.totalRowCount ?? 0;

  const table = useReactTable({
    data: flatData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalRowCount / limit),
    getRowId: (row) => String(row.id),
  });

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <DataTableToolbar.SearchBar />
      </div>

      <DataTableWrapper
        table={table}
        isPending={isPending}
        variant="default"
        paginationMode="standard"
        totalRowCount={totalRowCount}
        EmptyView={
          <EmptyScreen
            Icon="lock"
            headline={t("no_locked_users")}
            description={t("no_locked_users_description")}
            className="bg-muted mb-16"
          />
        }
      />

      <Dialog open={!!userToUnlock} onOpenChange={() => setUserToUnlock(null)}>
        <ConfirmationDialogContent
          variety="warning"
          title={t("unlock_user")}
          confirmBtnText={t("unlock")}
          isPending={unlockUser.isPending}
          onConfirm={() => {
            if (userToUnlock) unlockUser.mutate({ userId: userToUnlock.id });
          }}>
          {t("unlock_user_confirmation", { email: userToUnlock?.email ?? "" })}
        </ConfirmationDialogContent>
      </Dialog>
    </>
  );
}

export function LockedUsersView() {
  const pathname = usePathname();

  return (
    <DataTableProvider tableIdentifier={pathname ?? "locked-users"}>
      <LockedUsersContent />
    </DataTableProvider>
  );
}
