import { useRef, useState } from "react";

import { trpc } from "@calcom/trpc/react";
import { DataTable, Button } from "@calcom/ui";

import CreateTeamDialog from "./CreateTeamDialog";
import GroupNameCell from "./GroupNameCell";

const columns = [
  {
    id: "name",
    header: "Team",
    cell: ({ row }) => {
      const { name } = row.original;

      return <p>{name}</p>;
    },
  },
  {
    id: "url",
    header: "URL",
    cell: ({ row }) => {
      const { slug } = row.original;

      return <a href={`/teams/${slug}`}>{slug}</a>;
    },
  },
  {
    id: "group",
    header: "Group Name",
    cell: ({ row }) => {
      const { id, groupNames, directoryId } = row.original;

      return <GroupNameCell groupNames={groupNames} teamId={id} directoryId={directoryId} />;
    },
  },
];

const GroupTeamMappingTable = () => {
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false);

  const { data } = trpc.viewer.dsync.teamGroupMapping.get.useQuery({ orgId: 1 });

  const tableContainerRef = useRef<HTMLDivElement>(null);
  return (
    <>
      <DataTable
        data={data ? data.teamGroupMapping : []}
        tableContainerRef={tableContainerRef}
        columns={columns}
        tableCTA={<Button onClick={() => setCreateTeamDialogOpen(true)}>Create team</Button>}
      />
      <CreateTeamDialog open={createTeamDialogOpen} onOpenChange={setCreateTeamDialogOpen} />
    </>
  );
};

export default GroupTeamMappingTable;
