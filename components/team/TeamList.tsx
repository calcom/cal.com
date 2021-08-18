import { useState } from "react";
import TeamListItem from "./TeamListItem";
import EditTeamModal from "./EditTeamModal";
import MemberInvitationModal from "./MemberInvitationModal";
import { Dialog, DialogHeader, DialogContent } from "@components/Dialog";

export default function TeamList(props) {
  const [showDisbandTeamModal, setShowDisbandTeamModal] = useState(false);
  const [showEditTeamModal, setShowEditTeamModal] = useState(false);
  const [team, setTeam] = useState(null);

  const selectAction = (action: string, team: any) => {
    setTeam(team);
    switch (action) {
      case "edit":
        // setShowEditTeamModal(true);
        props.onEditTeam(team);
        break;
      case "disband":
        setShowDisbandTeamModal(true);
        break;
    }
  };

  return (
    <div>
      <ul className="bg-white border px-4 mb-2 rounded divide-y divide-gray-200">
        {props.teams.map((team: any) => (
          <TeamListItem
            onChange={props.onChange}
            key={team.id}
            team={team}
            onActionSelect={(action: string) => selectAction(action, team)}></TeamListItem>
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
