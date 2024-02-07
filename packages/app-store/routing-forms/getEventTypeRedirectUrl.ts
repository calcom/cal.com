import { CAL_URL } from "@calcom/lib/constants";

function getUserAndEventTypeSlug(eventTypeRedirectUrl: string) {
  if (eventTypeRedirectUrl.startsWith("/")) {
    eventTypeRedirectUrl = eventTypeRedirectUrl.slice(1);
  }
  const parts = eventTypeRedirectUrl.split("/");
  const isTeamSlug = parts[0] == "team" ? true : false;
  const teamSlug = isTeamSlug ? parts[1] : null;
  const eventTypeSlug = teamSlug ? parts[2] : parts[1];
  const username = isTeamSlug ? null : parts[0];
  return { teamSlug, eventTypeSlug, username };
}

/**
 * Handles the following cases
 * 1. A team form where the team isn't a sub-team
 *    1.1 A team form where team isn't a sub-team and the user is migrated. i.e. User has been migrated but not the team
 *    1.2 A team form where team isn't a sub-team and the user is not migrated i.e. Both user and team are not migrated
 * 2. A team form where the team is a sub-team
 *    1.1 A team form where the team is a sub-team and the user is migrated i.e. Both user and team are migrated
 *    1.2 A team form where the team is a sub-team and the user is not migrated i.e. Team has been migrated but not the user
 * 3. A user form where the user is migrated
 *    3.1 A user form where the user is migrated and the team is migrated i.e. Both user and team are migrated
 *    3.2 A user form where the user is migrated and the team is not migrated i.e. User has been migrated but not the team
 * 4. A user form where the user is not migrated
 *    4.1 A user form where the user is not migrated and the team is migrated i.e. Team has been migrated but not the user
 *    4.2 A user form where the user is not migrated and the team is not migrated i.e. Both user and team are not migrated
 */
export function getAbsoluteEventTypeRedirectUrl({
  eventTypeRedirectUrl,
  form,
  allURLSearchParams,
}: {
  eventTypeRedirectUrl: string;
  form: {
    team: {
      // parentId is set if the team is a sub-team
      parentId: number | null;
    } | null;
    /**
     * Set only if user is migrated
     */
    nonOrgUsername: string | null;
    /**
     * Set only if team is migrated
     */
    nonOrgTeamslug: string | null;
    /**
     * The origin for the user
     */
    userOrigin: string;
    /**
     * The origin for the team the form belongs to
     */
    teamOrigin: string;
  };
  allURLSearchParams: URLSearchParams;
}) {
  // It could be using the old(before migration) username/team-slug or it could be using the new one(after migration)
  // If it's using the old one, it would work by redirection as long as we use CAL_URL(which is non-org domain)
  // But if it's using the new one, it has to use the org domain.
  // The format is /user/abc or /team/team1/abc
  const { username: usernameInRedirectUrl, teamSlug: teamSlugInRedirectUrl } =
    getUserAndEventTypeSlug(eventTypeRedirectUrl);

  if (!teamSlugInRedirectUrl && !usernameInRedirectUrl) {
    throw new Error("eventTypeRedirectUrl must have username or teamSlug");
  }

  if (teamSlugInRedirectUrl && form.nonOrgTeamslug) {
    const isEventTypeRedirectToOldTeamSlug = teamSlugInRedirectUrl === form.nonOrgTeamslug;
    if (isEventTypeRedirectToOldTeamSlug) {
      return `${CAL_URL}/${eventTypeRedirectUrl}?${allURLSearchParams}`;
    }
  }

  if (usernameInRedirectUrl && form.nonOrgUsername) {
    const isEventTypeRedirectToOldUser = usernameInRedirectUrl === form.nonOrgUsername;
    if (isEventTypeRedirectToOldUser) {
      return `${CAL_URL}/${eventTypeRedirectUrl}?${allURLSearchParams}`;
    }
  }

  const origin = teamSlugInRedirectUrl ? form.teamOrigin : form.userOrigin;

  return `${origin}/${eventTypeRedirectUrl}?${allURLSearchParams}`;
}
