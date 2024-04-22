import { useState } from "react";

import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge, Icon, showToast, TextField } from "@calcom/ui";

interface GroupNameCellProps {
  groupNames: string[];
  teamId: number;
  directoryId: string;
}

const GroupNameCell = ({ groupNames, teamId, directoryId }: GroupNameCellProps) => {
  const [showTextInput, setShowTextInput] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const createMutation = trpc.viewer.dsync.teamGroupMapping.create.useMutation({
    onSuccess: (data) => {
      utils.viewer.dsync.teamGroupMapping.get.setData(undefined, (prev) => {
        if (prev) {
          const teamIndex = prev.teamGroupMapping.findIndex((team) => team.id === teamId);
          prev.teamGroupMapping[teamIndex].groupNames.push(data.newGroupName);
        }
        return prev;
      });
      setShowTextInput(false);
      setNewGroupName("");
      showToast(`Group added`, "success");
    },
    onError: (error) => {
      showToast(`Error adding group name${error.message}`, "error");
    },
  });

  const deleteMutation = trpc.viewer.dsync.teamGroupMapping.delete.useMutation({
    onSuccess: (data) => {
      utils.viewer.dsync.teamGroupMapping.get.setData(undefined, (prev) => {
        if (prev) {
          const teamIndex = prev.teamGroupMapping.findIndex((team) => team.id === teamId);
          const indexToRemove = prev.teamGroupMapping[teamIndex].groupNames.indexOf(data.deletedGroupName);
          prev.teamGroupMapping[teamIndex].groupNames.splice(indexToRemove, 1);
        }
        return prev;
      });
      showToast(`Group removed`, "success");
    },
    onError: (error) => {
      showToast(`Error removing group name${error.message}`, "error");
    },
  });

  const addGroupName = (groupName: string) => {
    if (groupNames.some((name: string) => name === groupName)) {
      showToast(`Group name already added`, "error");
      return;
    }

    createMutation.mutate({ teamId: teamId, name: groupName, directoryId: directoryId });
  };

  const removeGroupName = (groupName: string) => {
    deleteMutation.mutate({
      teamId: teamId,
      groupName: groupName,
    });
  };

  return (
    <div className="flex items-center space-x-4">
      {groupNames.map((name) => (
        <Badge variant="gray" size="lg" key={name} className="h-8 py-4">
          <div className="flex items-center space-x-2 ">
            <p>{name}</p>
            <div className="hover:bg-emphasis rounded p-1">
              <Icon name="x" className="h-4 w-4 stroke-[3px]" onClick={() => removeGroupName(name)} />
            </div>
          </div>
        </Badge>
      ))}
      <Badge variant="gray" size="lg" className={classNames(!showTextInput && "hover:bg-emphasis")}>
        <div
          className="flex items-center space-x-1"
          onClick={() => {
            if (!showTextInput) setShowTextInput(true);
          }}>
          {showTextInput ? (
            <TextField
              autoFocus
              className="mb-0 h-6"
              onBlur={() => {
                if (!newGroupName) setShowTextInput(false);
              }}
              onChange={(e) => setNewGroupName(e.target.value)}
              value={newGroupName}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  addGroupName(newGroupName);
                }
              }}
            />
          ) : (
            <p>{t("add_group_name")}</p>
          )}
          <div className={classNames("rounded p-1", showTextInput && "hover:bg-emphasis ml-2")}>
            <Icon name="plus" className="h-4 w-4 stroke-[3px]" onClick={() => addGroupName(newGroupName)} />
          </div>
        </div>
      </Badge>
    </div>
  );
};

export default GroupNameCell;
