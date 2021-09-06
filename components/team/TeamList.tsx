import TeamListItem from "./TeamListItem";
import { Team } from "@lib/team";

export default function TeamList(props: {
  teams: Team[];
  onChange: () => void;
  onEditTeam: (text: Team) => void;
}) {
  const selectAction = (action: string, team: Team) => {
    switch (action) {
      case "edit":
        props.onEditTeam(team);
        break;
      case "disband":
        deleteTeam(team);
        break;
    }
  };

  const deleteTeam = (team: Team) => {
    return fetch("/api/teams/" + team.id, {
      method: "DELETE",
    }).then(props.onChange());
  };

  return (
    <div>
      <ul className="px-4 mb-2 bg-white border divide-y divide-gray-200 rounded">
        {props.teams.map((team: Team) => (
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
