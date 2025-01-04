import { getBookerBaseUrl } from "@calcom/lib/getBookerUrl/server";

import type { getEventType } from "./getEventType";

export const getBookerUrl = async ({
  eventTypeTeam,
  organizerOrganizationId,
}: {
  eventTypeTeam: Awaited<ReturnType<typeof getEventType>>["team"];
  organizerOrganizationId?: number;
}) => {
  const bookerUrl = eventTypeTeam
    ? await getBookerBaseUrl(eventTypeTeam?.parentId)
    : await getBookerBaseUrl(organizerOrganizationId ?? null);

  return bookerUrl;
};
