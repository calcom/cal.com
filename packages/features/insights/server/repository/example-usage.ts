import { InsightsBookingRepository } from "./insights-booking.repository";

/**
 * Example usage of InsightsBookingRepository
 * This demonstrates how the repository pattern simplifies data access
 * while maintaining security through authorization conditions
 */
export async function getBookingInsights(
  userId: number,
  teamId?: number | null,
  eventTypeId?: number,
  memberUserId?: number
) {
  const repository = new InsightsBookingRepository(userId, {
    teamId,
    eventTypeId,
    memberUserId,
  });

  const bookings = await repository.findMany({
    where: {
      status: "ACCEPTED",
    },
    orderBy: {
      startTime: "desc",
    },
    take: 10,
  });

  const totalCount = await repository.count({
    where: {
      status: "ACCEPTED",
    },
  });

  return {
    bookings,
    totalCount,
  };
}

/**
 * Example of how this repository could be used in a tRPC procedure
 * replacing the current implementation in trpc-router.ts
 */
export async function exampleTRPCProcedure(ctx: any, input: any) {
  const { user } = ctx;
  const { teamId, eventTypeId, memberUserId, isAll } = input;

  const repository = new InsightsBookingRepository(
    user.id,
    {
      teamId,
      eventTypeId,
      memberUserId,
      userId: isAll ? undefined : user.id,
      isAll,
    },
    {
      userIsOwnerAdminOfParentTeam: user.isOwnerAdminOfParentTeam,
      userOrganizationId: user.organizationId,
    }
  );

  const bookings = await repository.findMany({
    where: {
      timeStatus: "upcoming",
    },
    select: {
      id: true,
      title: true,
      startTime: true,
      endTime: true,
      status: true,
    },
    orderBy: {
      startTime: "asc",
    },
  });

  return bookings;
}
