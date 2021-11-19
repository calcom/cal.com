import { useEffect, useState } from "react";

import { handleErrorsJson } from "@lib/errors";
import { Team } from "@lib/types/team";

interface TeamAvailabilityProps {
  team: Team;
}

export default function TeamAvailability(props: TeamAvailabilityProps) {
  const [teamMembers, setTeamMembers] = useState();

  useEffect(() => {
    fetch("/api/teams/" + props.team?.id + "/membership")
      .then(handleErrorsJson)
      .then((data) => {
        setTeamMembers(data.members);
      })
      .catch(console.log);
  }, [props.team?.id]);

  return <div>{JSON.stringify({ team: props.team, members: teamMembers || [] })}</div>;
}
