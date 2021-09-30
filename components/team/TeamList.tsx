import { useLocale } from "@lib/hooks/useLocale";
import { Team } from "@lib/team";

import TeamListItem from "./TeamListItem";

export default function TeamList(props: {
  localeProp: string;
  teams: Team[];
  onChange: () => void;
  onEditTeam: (text: Team) => void;
}) {
  const { locale } = useLocale({ localeProp: props.localeProp });

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

  const deleteTeam = async (team: Team) => {
    await fetch("/api/teams/" + team.id, {
      method: "DELETE",
    });
    return props.onChange();
  };

  return (
    <div>
      <ul className="px-4 mb-2 bg-white border divide-y divide-gray-200 rounded">
        {props.teams.map((team: Team) => (
          <TeamListItem
            localeProp={locale}
            onChange={props.onChange}
            key={team.id}
            team={team}
            onActionSelect={(action: string) => selectAction(action, team)}></TeamListItem>
        ))}
      </ul>
    </div>
  );
}
