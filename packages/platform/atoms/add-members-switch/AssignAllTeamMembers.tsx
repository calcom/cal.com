import React from "react";

export type AssignAllTeamMembersProps = {
  onClick?: () => void;
};

const AssignAllTeamMembers: React.FC<AssignAllTeamMembersProps> = ({ onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ padding: "8px 16px", borderRadius: 4, background: "#eee", border: "1px solid #ccc" }}>
      Assign All Team Members
    </button>
  );
};

export default AssignAllTeamMembers;
