import { Team } from "@lib/types/team";

import TeamListItem from "./TeamListItem";

export default function TeamList(props: { teams: Team[]; onChange: () => void }) {
  const selectAction = (action: string, team: Team) => {
    switch (action) {
      case "disband":
        deleteTeam(team);
        break;
    }
  };

  const deleteTeam = async (team: Team) => {
    await fetch("/api/teams/" + team.id, {
      method: "DELETE",
    });
    return props.onChange();
  };

  return (
    <div>
      <ul className="mb-2 bg-white border divide-y rounded divide-neutral-200">
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
