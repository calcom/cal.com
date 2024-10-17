import type { TeamQuery } from "@calcom/ee/teams/teams.repository";
import getUserTeamsQuery from "@calcom/lib/apps/getUserTeamsQuery";

const getUserAvailableTeams = async (userId: number, teamId?: number | null) => {
  const userTeamsQuery = await getUserTeamsQuery(userId);

  // If a team is a part of an org then include those apps
  // Don't want to iterate over these parent teams
  const filteredTeams: TeamQuery[] = [];
  const parentTeams: TeamQuery[] = [];
  // Only loop and grab parent teams if a teamId was given. If not then all teams will be queried
  if (teamId) {
    userTeamsQuery.forEach((team) => {
      if (team?.parent) {
        const { parent, ...filteredTeam } = team;
        filteredTeams.push(filteredTeam);
        // Only add parent team if it's not already in teamsQuery
        if (!userTeamsQuery.some((t) => t.id === parent.id)) {
          parentTeams.push(parent);
        }
      }
    });
  }

  const userAvailableTeams = [...userTeamsQuery, ...parentTeams];

  return userAvailableTeams;
};

export default getUserAvailableTeams;
