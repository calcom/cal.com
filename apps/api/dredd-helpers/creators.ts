import { baseUrl } from "./constants";
import { getTeams, getUsers } from "./getters";

export async function createUser(apiKey: string) {
  const email = "deleteme@example.com";
  await fetch(`${baseUrl}/users?apiKey=${apiKey}`, {
    method: "POST",
    body: JSON.stringify({
      email,
      username: "Delete Me",
    }),
  });

  const users = await getUsers(apiKey);

  // TODO: is there an interface we can use here?
  const deleteMeUser = users.find((user: any) => {
    return user.email === email;
  });

  return deleteMeUser;
}

export async function createTeam(apiKey: string) {
  const slug = "delete-me-team";
  await fetch(`${baseUrl}/teams?apiKey=${apiKey}`, {
    method: "POST",
    body: JSON.stringify({
      slug,
      teamname: "Delete Me",
    }),
  });

  const teams = await getTeams(apiKey);

  // TODO: is there an interface we can use here?
  const deleteMeTeam = teams.find((team: any) => {
    return team.slug === slug;
  });

  return deleteMeTeam;
}
