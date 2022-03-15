import { Team, User } from ".prisma/client";

export function isSuccessRedirectAvailable(
  eventType: {
    users: {
      plan: User["plan"];
    }[];
  } & {
    team: Partial<Team> | null;
  }
) {
  return eventType.users[0]?.plan !== "FREE" || eventType.team;
}
