import { CAL_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

import type { TextComponent } from "../lib";

/**
 * Check if the url is a valid cal.com url
 * @param url
 * @returns boolean
 */
export async function isValidCalURL(url: string) {
  const regex = new RegExp(`^${CAL_URL}/`, `i`);

  const error: TextComponent = {
    type: "text",
    text: `This is not a valid ${CAL_URL.replace("https://", "")} link`,
    style: "error",
    align: "left",
  };

  if (!regex.test(url)) return error;

  const urlWithoutCal = url.replace(regex, "");

  const urlParts = urlWithoutCal.split("/");
  const usernameOrTeamSlug = urlParts[0];
  const eventTypeSlug = urlParts[1];

  if (!usernameOrTeamSlug || !eventTypeSlug) return error;

  // Find all potential users with the given username
  const potentialUsers = await prisma.user.findMany({
    where: {
      username: usernameOrTeamSlug,
    },
    include: {
      eventTypes: {
        where: {
          slug: eventTypeSlug,
          hidden: false,
        },
      },
    },
  });

  // Find all potential teams with the given slug
  const potentialTeams = await prisma.team.findMany({
    where: {
      slug: usernameOrTeamSlug,
    },
    include: {
      eventTypes: {
        where: {
          slug: eventTypeSlug,
          hidden: false,
        },
      },
    },
  });

  // Check if any user has the matching eventTypeSlug
  const matchingUser = potentialUsers.find((user) => user.eventTypes.length > 0);

  // Check if any team has the matching eventTypeSlug
  const matchingTeam = potentialTeams.find((team) => team.eventTypes.length > 0);

  if (!matchingUser && !matchingTeam) return error;

  const userOrTeam = matchingUser || matchingTeam;

  if (!userOrTeam) return error;

  // Retrieve the correct user or team
  const userOrTeamId = userOrTeam.id;

  const eventType = await prisma.eventType.findFirst({
    where: {
      userId: userOrTeamId,
      slug: eventTypeSlug,
      hidden: false,
    },
  });

  if (!eventType) return error;

  return true;
}
