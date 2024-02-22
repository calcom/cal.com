import { useRef, useState } from "react";

import { DataTable, Button } from "@calcom/ui";

import CreateTeamDialog from "./CreateTeamDialog";

const columns = [
  {
    id: "team",
    header: "Team",
  },
  {
    id: "group",
    header: "Group Name",
  },
];

const GroupTeamMappingTable = () => {
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  return (
    <>
      <h1>Group Team Mapping</h1>
      <DataTable
        data={[]}
        tableContainerRef={tableContainerRef}
        columns={columns}
        tableCTA={<Button onClick={() => setCreateTeamDialogOpen(true)}>Create team</Button>}
      />
      <CreateTeamDialog open={createTeamDialogOpen} onOpenChange={setCreateTeamDialogOpen} />
    </>
  );
};

export default GroupTeamMappingTable;
