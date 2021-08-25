import TeamListItem from "./TeamListItem";

export default function TeamList(props: any) {

  const selectAction = (action: string, team: any) => {
    switch (action) {
      case "edit":
        props.onEditTeam(team);
        break;
      case "disband":
        deleteTeam(team);
        break;
    }
  };

  const deleteTeam = (team :any) => {
    return fetch("/api/teams/" + team.id, {
      method: "DELETE",
    })
    .then(props.onChange());
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
