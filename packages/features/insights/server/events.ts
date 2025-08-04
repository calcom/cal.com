import { readonlyPrisma as prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

export class EventsInsights {
  static countGroupedByStatus = async (where: Prisma.BookingTimeStatusDenormalizedWhereInput) => {
    const data = await prisma.bookingTimeStatusDenormalized.groupBy({
      where,
      by: ["timeStatus", "noShowHost"],
      _count: {
        _all: true,
      },
    });

    return data.reduce(
      (aggregate: { [x: string]: number }, item) => {
        if (typeof item.timeStatus === "string" && item) {
          aggregate[item.timeStatus] += item?._count?._all ?? 0;
          aggregate["_all"] += item?._count?._all ?? 0;

          if (item.noShowHost) {
            aggregate["noShowHost"] += item?._count?._all ?? 0;
          }
        }
        return aggregate;
      },
      {
        completed: 0,
        rescheduled: 0,
        cancelled: 0,
        noShowHost: 0,
        _all: 0,
      }
    );
  };
}
