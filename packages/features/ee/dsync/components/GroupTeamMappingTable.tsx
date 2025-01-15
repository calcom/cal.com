import type { ColumnDef } from "@tanstack/react-table";
import { useReactTable, getCoreRowModel } from "@tanstack/react-table";
import { useRef, useState } from "react";

import { DataTable, DataTableToolbar } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";

import CreateTeamDialog from "./CreateTeamDialog";
import GroupNameCell from "./GroupNameCell";

interface TeamGroupMapping {
  name: string;
  id: number;
  groupNames: string[];
  directoryId: string;
}

const GroupTeamMappingTable = () => {
  const { t } = useLocale();
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false);

  const { data } = trpc.viewer.dsync.teamGroupMapping.get.useQuery();

  const tableContainerRef = useRef<HTMLDivElement>(null);

  const columns: ColumnDef<TeamGroupMapping>[] = [
    {
      id: "name",
      header: t("team"),
      size: 200,
      cell: ({ row }) => {
        const { name } = row.original;

        return <p>{name}</p>;
      },
    },
    {
      id: "group",
      header: t("group_name"),
      size: 200,
      cell: ({ row }) => {
        const { id, groupNames, directoryId } = row.original;

        return <GroupNameCell groupNames={groupNames} teamId={id} directoryId={directoryId} />;
      },
    },
  ];

  const table = useReactTable({
    data: data?.teamGroupMapping ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <DataTable table={table} tableContainerRef={tableContainerRef}>
        <DataTableToolbar.Root>
          <DataTableToolbar.CTA onClick={() => setCreateTeamDialogOpen(true)}>
            Create team
          </DataTableToolbar.CTA>
        </DataTableToolbar.Root>
      </DataTable>
      <CreateTeamDialog open={createTeamDialogOpen} onOpenChange={setCreateTeamDialogOpen} />
    </>
  );
};

export default GroupTeamMappingTable;
