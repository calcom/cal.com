import { useRef, useState } from "react";

import { trpc } from "@calcom/trpc/react";
import { DataTable, Button } from "@calcom/ui";

import CreateTeamDialog from "./CreateTeamDialog";

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
    cell: ({ row }) => <p>{row.id}</p>,
  },
];

const GroupTeamMappingTable = () => {
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false);

  const { data, isLoading } = trpc.viewer.dsync.teamGroupMapping.get.useQuery({ orgId: 1 });
  console.log("🚀 ~ GroupTeamMappingTable ~ data:", data);

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
