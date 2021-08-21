import { useState } from "react";
import MemberListItem from "./MemberListItem";
import { Dialog, DialogHeader, DialogContent } from "@components/Dialog";

export default function MemberList(props) {
  const [member, setMember] = useState(null);

  const selectAction = (action: string, member: any) => {
    setMember(member);
    switch (action) {
      case "remove":
        // setShowEditTeamModal(true);
        // props.onRemove(member);
        console.log('action-remove')
        break;
    }
  };

  return (
    <div>
      <ul className="bg-white border px-4 mb-2 rounded divide-y divide-gray-200">
        {props.members.map((member: any) => (
          <MemberListItem
            onChange={props.onChange}
            key={member.id}
            member={member}
            onActionSelect={(action: string) => selectAction(action, member)} />
        ))}
      </ul>
      {/* {showEditTeamModal && (
        <EditTeamModal
          team={team}
          onExit={() => {
            props.onChange();
            setShowEditTeamModal(false);
          }}></EditTeamModal>
      )} */}
      {/* {showDisbandTeamModal && (
        <MemberInvitationModal
          team={team}
          onExit={() => setShowDisbandTeamModal(false)}></MemberInvitationModal>
      )} */}
    </div>
  );
}
