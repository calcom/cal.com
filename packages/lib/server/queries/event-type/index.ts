import prisma, { minimalEventTypeSelect } from "@calcom/prisma";

type WhereClause = {
  team?: {
    slug: string;
  };
  slug: string;
  userId?: number;
};

export async function getEventTypeWithUsers(eventTypeSlug: string, teamSlug?: string, username?: string) {
  const whereClause: WhereClause = {
    slug: eventTypeSlug,
  };

  if (teamSlug) {
    whereClause["team"] = {
      slug: teamSlug,
    };
  }

  if (eventTypeSlug) {
    whereClause["slug"] = eventTypeSlug;
  }

  if (username) {
    const user = await prisma.user.findFirst({
      select: {
        id: true,
      },
      where: {
        username,
      },
    });
    whereClause["userId"] = user?.id;
  }

  const eventType = await prisma.eventType.findFirst({
    select: {
      ...minimalEventTypeSelect,
      team: {
        select: {
          id: true,
        },
      },
      users: {
        select: {
          name: true,
          username: true,
          email: true,
        },
      },
    },
    where: whereClause,
  });
  return { eventType };
}
