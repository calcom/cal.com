"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";

import {
  DataTableProvider,
  DataTableWrapper,
  DataTableToolbar,
  useDataTable,
} from "@calcom/features/data-table";
import type { TeamFeatures } from "@calcom/features/flags/config";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@calcom/ui/components/sheet";

import { TeamFeaturesEditSheet } from "./TeamFeaturesEditSheet";

type TeamWithFeatures = {
  id: number;
  name: string;
  slug: string | null;
  parentId: number | null;
  isOrganization: boolean;
  platformBilling: { id: number } | null;
  children: { id: number; name: string }[];
  features: TeamFeatures;
};

export function TeamFeaturesListingView() {
  return (
    <DataTableProvider defaultPageSize={25}>
      <TeamFeaturesListingContent />
    </DataTableProvider>
  );
}

function TeamFeaturesListingContent() {
  const { t } = useLocale();
  const [selectedTeam, setSelectedTeam] = useState<TeamWithFeatures | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [parentId, setParentId] = useState<number | undefined>(undefined);

  const { limit, offset, searchTerm } = useDataTable();

  const { data, isPending } = trpc.viewer.admin.teamFeatures.listAllWithFeatures.useQuery(
    {
      limit,
      offset,
      searchTerm,
      parentId,
    },
    {
      placeholderData: keepPreviousData,
    }
  );

  const columns = useMemo<ColumnDef<TeamWithFeatures>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: t("name"),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.original.name}</span>
            {row.original.isOrganization && (
              <Badge variant="blue" className="text-xs">
                {t("organization")}
              </Badge>
            )}
          </div>
        ),
      },
      {
        id: "slug",
        accessorKey: "slug",
        header: t("slug"),
        cell: ({ row }) => row.original.slug || "-",
      },
      {
        id: "subscriptionId",
        header: t("subscription_id"),
        cell: ({ row }) => row.original.platformBilling?.id || "-",
      },
      {
        id: "childTeams",
        header: t("child_teams"),
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.children.map((child) => (
              <Button
                key={child.id}
                variant="button"
                color="secondary"
                size="sm"
                onClick={() => setParentId(child.id)}
                className="text-xs">
                {child.name}
              </Button>
            ))}
            {row.original.children.length === 0 && "-"}
          </div>
        ),
      },
      {
        id: "features",
        header: t("features"),
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {Object.entries(row.original.features)
              .filter(([, enabled]) => enabled)
              .map(([feature]) => (
                <Badge key={feature} variant="green" className="text-xs">
                  {feature}
                </Badge>
              ))}
          </div>
        ),
      },
      {
        id: "actions",
        header: t("actions"),
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              variant="button"
              color="secondary"
              size="sm"
              onClick={() => {
                setSelectedTeam(row.original);
                setIsEditSheetOpen(true);
              }}>
              {t("edit")}
            </Button>
            <Button
              variant="button"
              color="secondary"
              size="sm"
              onClick={() => {
                setSelectedTeam(row.original);
                setIsEditSheetOpen(true);
              }}>
              {t("preview")}
            </Button>
          </div>
        ),
      },
    ],
    [t, setParentId]
  );

  const table = useReactTable({
    data: data?.teams ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
  });

  return (
    <>
      <DataTableWrapper
        table={table}
        isPending={isPending}
        totalRowCount={data?.totalCount}
        paginationMode="standard"
        ToolbarLeft={
          <>
            <DataTableToolbar.SearchBar />
            {parentId && (
              <Button variant="button" color="secondary" onClick={() => setParentId(undefined)}>
                {t("back_to_all_teams")}
              </Button>
            )}
          </>
        }
      />

      <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {selectedTeam ? `${t("edit_team_features")}: ${selectedTeam.name}` : t("edit_team_features")}
            </SheetTitle>
          </SheetHeader>
          {selectedTeam && (
            <TeamFeaturesEditSheet team={selectedTeam} onClose={() => setIsEditSheetOpen(false)} />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
