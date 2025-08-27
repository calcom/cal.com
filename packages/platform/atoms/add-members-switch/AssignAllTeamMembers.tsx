import React from "react";

export type AssignAllTeamMembersProps = {
  onAssignAll: () => void;
  disabled?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

const AssignAllTeamMembers: React.FC<AssignAllTeamMembersProps> = ({
  onAssignAll,
  disabled,
  checked = false,
  onCheckedChange,
}) => {
  const handleClick = () => {
    if (onCheckedChange) {
      onCheckedChange(!checked);
    } else {
      onAssignAll();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      data-testid="assign-all-team-members-toggle"
      aria-checked={checked}
      style={{ padding: "8px 16px", borderRadius: 4, background: "#eee", border: "1px solid #ccc" }}>
      Assign All Team Members
    </button>
  );
};

export default AssignAllTeamMembers;
