import { useState } from "react";
import TeamListItem from "./TeamListItem";
import EditTeamModal from "./EditTeamModal";
import MemberInvitationModal from "./MemberInvitationModal";
import { Dialog, DialogHeader, DialogContent } from "@components/Dialog";

export default function TeamList(props: any) {
  const [team, setTeam] = useState(null);

  const selectAction = (action: string, team: any) => {
    setTeam(team);
    switch (action) {
      case "edit":
        // setShowEditTeamModal(true);
        props.onEditTeam(team);
        break;
      case "disband":
        // show disband confirmation modal
        deleteTeam();
        break;
    }
  };

  const deleteTeam = () => {
    // e.preventDefault();
    console.log(props);
    // return fetch("/api/teams/" + props.team.id, {
    //   method: "DELETE",
    // }).then(props.onExit);
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
    </div>
  );
}
