import { CAL_URL } from "@calcom/lib/constants";

export default function getCalLink(eventType: {
  team?: { slug: string | null } | null;
  owner?: { username: string | null } | null;
  users?: { username: string | null }[];
  slug: string;
}) {
  return `${CAL_URL}/${
    eventType?.team
      ? `team/${eventType?.team?.slug}`
      : eventType?.owner
      ? eventType.owner.username
      : eventType?.users?.[0]?.username
  }/${eventType?.slug}`;
}
