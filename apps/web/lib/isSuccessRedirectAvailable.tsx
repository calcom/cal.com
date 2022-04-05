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
  // As Team Event is available in PRO plan only, just check if it's a team event.
  return eventType.users[0]?.plan !== "FREE" || eventType.team;
}
