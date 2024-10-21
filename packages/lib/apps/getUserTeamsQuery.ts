import { Teams } from "@calcom/ee/teams";

const getUserTeamsQuery = async (userId: number) => {
  const teamsQuery = await Teams.repo.getUserTeams(userId);

  return teamsQuery;
};

export default getUserTeamsQuery;
