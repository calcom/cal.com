"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import {
  DataTableProvider,
  DataTableWrapper,
  DataTableToolbar,
  DataTableFilters,
  useColumnFilters,
  ColumnFilterType,
  useDataTable,
} from "@calcom/features/data-table";
import { useSegments } from "@calcom/features/data-table/hooks/useSegments";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import { DropdownActions } from "@calcom/ui/components/table";
import { showToast } from "@calcom/ui/components/toast";

type Team = RouterOutputs["viewer"]["teams"]["adminGetAll"]["rows"][number];

export function AdminTeamTable() {
  return (
    <DataTableProvider tableIdentifier="admin-teams" useSegments={useSegments} defaultPageSize={10}>
      <AdminTeamTableContent />
    </DataTableProvider>
  );
}

function AdminTeamTableContent() {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);

  const columnFilters = useColumnFilters();
  const { limit, offset, searchTerm } = useDataTable();

  const { data, isPending } = trpc.viewer.teams.adminGetAll.useQuery(
    {
      limit,
      offset,
      searchTerm,
      filters: columnFilters
        .filter(
          (filter) =>
            typeof filter.value === "string" ||
            typeof filter.value === "boolean" ||
            Array.isArray(filter.value)
        )
        .map((filter) => ({
          id: filter.id,
          value: filter.value as string | string[] | boolean,
        })),
    },
    {
      placeholderData: keepPreviousData,
    }
  );

  const deleteMutation = trpc.viewer.teams.adminDelete.useMutation({
    onSuccess: async () => {
      showToast(t("team_deleted_successfully"), "success");
      await utils.viewer.teams.adminGetAll.invalidate();
      setTeamToDelete(null);
    },
    onError: (error) => {
      showToast(error.message || t("something_went_wrong"), "error");
    },
  });

  const flatData = useMemo<Team[]>(() => data?.rows ?? [], [data]);
  const totalRowCount = data?.meta?.totalRowCount ?? 0;

  const columns = useMemo<ColumnDef<Team>[]>(
    () => [
      {
        id: "name",
        header: t("team_name"),
        accessorFn: (team) => team.name,
        enableColumnFilter: true,
        meta: {
          filter: { type: ColumnFilterType.TEXT },
        },
        cell: ({ row }) => {
          const team = row.original;
          return (
            <div className="text-subtle font-medium">
              <Link
                href={`/settings/admin/teams/${team.id}/edit`}
                className="text-default hover:underline">
                {team.name}
              </Link>
              {team.slug && (
                <>
                  <br />
                  <span className="text-muted text-xs">{team.slug}</span>
                </>
              )}
            </div>
          );
        },
      },
      {
        id: "organization",
        header: t("organization"),
        accessorFn: (team) => team.parent?.name || "None",
        enableColumnFilter: true,
        meta: {
          filter: {
            type: ColumnFilterType.SINGLE_SELECT,
          },
        },
        cell: ({ row }) => {
          const team = row.original;
          if (!team.parent) {
            return <span className="text-subtle text-sm">None</span>;
          }
          return (
            <div>
              <span className="text-default text-sm">{team.parent.name}</span>
              <br />
              <span className="text-muted text-xs">{team.parent.slug}</span>
            </div>
          );
        },
      },
      {
        id: "owner",
        header: t("owner"),
        accessorFn: (team) => (team.members.length ? team.members[0].user.email : "No owner"),
        enableColumnFilter: false,
        cell: ({ row }) => {
          const team = row.original;
          if (!team.members.length) {
            return <span className="text-subtle text-sm">No owner</span>;
          }
          return (
            <div className="break-all">
              <div className="text-default text-sm">{team.members[0].user.name}</div>
              <div className="text-muted text-xs">{team.members[0].user.email}</div>
            </div>
          );
        },
      },
      {
        id: "hasBilling",
        header: t("billing"),
        accessorFn: (team) => !!team.metadata?.subscriptionId,
        enableColumnFilter: true,
        meta: {
          filter: {
            type: ColumnFilterType.SINGLE_SELECT,
          },
        },
        cell: ({ row }) => {
          const team = row.original;
          const hasBilling = !!team.metadata?.subscriptionId;
          return (
            <div className="space-x-2">
              {hasBilling ? (
                <Badge variant="green">{t("active")}</Badge>
              ) : (
                <Badge variant="gray">{t("none")}</Badge>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const team = row.original;
          return (
            <div className="flex w-full justify-end">
              <DropdownActions
                actions={[
                  {
                    id: "edit",
                    label: t("edit"),
                    onClick: () => {
                      window.location.href = `/settings/admin/teams/${team.id}/edit`;
                    },
                    icon: "pencil" as const,
                  },
                  {
                    id: "delete",
                    label: t("delete"),
                    onClick: () => {
                      setTeamToDelete(team);
                    },
                    icon: "trash" as const,
                  },
                ]}
              />
            </div>
          );
        },
      },
    ],
    [t]
  );

  const table = useReactTable({
    data: flatData,
    columns,
    manualPagination: true,
    initialState: {
      columnPinning: {
        right: ["actions"],
      },
    },
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => `${row.id}`,
  });

  return (
    <>
      <DataTableWrapper<Team>
        testId="admin-team-data-table"
        table={table}
        isPending={isPending}
        totalRowCount={totalRowCount}
        paginationMode="standard"
        containerClassName="max-w-full"
        ToolbarLeft={
          <>
            <DataTableToolbar.SearchBar />
          </>
        }
        ToolbarRight={
          <>
            <DataTableFilters.ColumnVisibilityButton table={table} />
          </>
        }
      />

      <Dialog open={!!teamToDelete} onOpenChange={() => setTeamToDelete(null)}>
        <ConfirmationDialogContent
          variety="danger"
          title={t("delete_team")}
          confirmBtnText={t("delete")}
          isPending={deleteMutation.isPending}
          onConfirm={() => {
            if (teamToDelete) {
              deleteMutation.mutate({ id: teamToDelete.id });
            }
          }}>
          {t("delete_team_confirmation_message", { teamName: teamToDelete?.name })}
        </ConfirmationDialogContent>
      </Dialog>
    </>
  );
}

export default AdminTeamTable;
