import React from "react";

export type AssignAllTeamMembersProps = {
  onAssignAll: () => void;
  disabled?: boolean;
};

const AssignAllTeamMembers: React.FC<AssignAllTeamMembersProps> = ({ onAssignAll, disabled }) => (
  <button
    type="button"
    onClick={onAssignAll}
    disabled={disabled}
    style={{ padding: "8px 16px", borderRadius: 4, background: "#eee", border: "1px solid #ccc" }}>
    Assign All Team Members
  </button>
);

export default AssignAllTeamMembers;
