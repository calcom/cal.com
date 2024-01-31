import type z from "zod";

import { CAL_URL } from "@calcom/lib/constants";
import type { teamMetadataSchema, userMetadata } from "@calcom/prisma/zod-utils";

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

export function getAbsoluteEventTypeRedirectUrl({
  eventTypeRedirectUrl,
  form,
  allURLSearchParams,
}: {
  eventTypeRedirectUrl: string;
  form: {
    migratedTeamToOrgFrom: Partial<
      NonNullable<z.infer<typeof teamMetadataSchema>>["migratedToOrgFrom"]
    > | null;
    migratedUserToOrgFrom: Partial<NonNullable<z.infer<typeof userMetadata>>["migratedToOrgFrom"]> | null;
    origin: string;
  };
  allURLSearchParams: URLSearchParams;
}) {
  // It could be using the old(before migration) username/team-slug or it could be using the new one(after migration)
  // If it's using the old one, it would work by redirection as long as we use CAL_URL(which is non-org domain)
  // But if it's using the new one, it has to use the org domain.
  // The format is /user/abc or /team/team1/abc
  const { username, teamSlug } = getUserAndEventTypeSlug(eventTypeRedirectUrl);

  if (!teamSlug && !username) {
    throw new Error("eventTypeRedirectUrl must have username or teamSlug");
  }

  if (teamSlug) {
    const isEventTypeRedirectToOldTeamSlug = teamSlug === form.migratedTeamToOrgFrom?.teamSlug;
    if (isEventTypeRedirectToOldTeamSlug) {
      return `${CAL_URL}/${eventTypeRedirectUrl}?${allURLSearchParams}`;
    }
  } else {
    const isEventTypeRedirectToOldUser = username === form.migratedUserToOrgFrom?.username;
    if (isEventTypeRedirectToOldUser) {
      return `${CAL_URL}/${eventTypeRedirectUrl}?${allURLSearchParams}`;
    }
  }

  return `${form.origin}/${eventTypeRedirectUrl}?${allURLSearchParams}`;
}
