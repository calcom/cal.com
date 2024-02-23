import { useState } from "react";

import { classNames } from "@calcom/lib";
import { Badge, TextField } from "@calcom/ui";
import { X, Plus } from "@calcom/ui/components/icon";

const GroupNameCell = (props) => {
  const [groupNames, setGroupNames] = useState(props.groupNames);
  const [showTextInput, setShowTextInput] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const addGroupName = (groupName) => {
    setGroupNames([...groupNames, groupName]);
    setShowTextInput(false);
    setNewGroupName("");
  };

  return (
    <div className="flex items-center space-x-4">
      {groupNames.map((name) => (
        <Badge variant="gray" size="lg" key={name} className="h-8 py-4">
          <div className="flex items-center space-x-2 ">
            <p>{name}</p>
            <div
              className="hover:bg-emphasis rounded p-1"
              onClick={() => {
                setGroupNames(groupNames.filter((groupName) => groupName !== name));
              }}>
              <X className="h-4 w-4 stroke-[3px]" />
            </div>
          </div>
        </Badge>
      ))}
      <Badge variant="gray" size="lg" className={classNames(" ", !showTextInput && "hover:bg-emphasis")}>
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
            <p>Add Group Name</p>
          )}
          <div className={classNames("rounded p-1", showTextInput && "hover:bg-emphasis ml-2")}>
            <Plus className="h-4 w-4 stroke-[3px]" onClick={() => addGroupName(newGroupName)} />
          </div>
        </div>
      </Badge>
    </div>
  );
};

export default GroupNameCell;
