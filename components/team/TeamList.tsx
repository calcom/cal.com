import {useEffect, useState} from "react";
import TeamListItem from "./TeamListItem";
import EditTeamModal from "./EditTeamModal";
import MemberInvitationModal from "./MemberInvitationModal";

export default function TeamList(props) {

  const [ showMemberInvitationModal, setShowMemberInvitationModal ] = useState(false);
  const [ showEditTeamModal, setShowEditTeamModal ] = useState(false);
  const [ team, setTeam ] = useState(null);

  const selectAction = (action: string, team: any) => {
    setTeam(team);
    switch (action) {
      case 'edit':
        setShowEditTeamModal(true);
        break;
      case 'invite':
        setShowMemberInvitationModal(true);
        break;
    }
  };

  return (<div>
    <ul className="border px-2 mb-2 rounded divide-y divide-gray-200">
      {props.teams.map(
        (team: any) => <TeamListItem onChange={props.onChange} key={team.id} team={team} onActionSelect={
          (action: string) => selectAction(action, team)
        }></TeamListItem>
      )}
    </ul>
    {showEditTeamModal && <EditTeamModal team={team} onExit={() => {
      props.onChange();
      setShowEditTeamModal(false);
    }}></EditTeamModal>}
    {showMemberInvitationModal &&
      <MemberInvitationModal
        team={team}
        onExit={() => setShowMemberInvitationModal(false)}></MemberInvitationModal>
    }
  </div>);
}