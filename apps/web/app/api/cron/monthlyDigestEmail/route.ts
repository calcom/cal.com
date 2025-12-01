import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { sendMonthlyDigestEmail } from "@calcom/emails/workflow-email-service";
import { EventsInsights } from "@calcom/features/insights/server/events";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

const querySchema = z.object({
  page: z.coerce.number().min(0).optional().default(0),
});

async function postHandler(request: NextRequest) {
  const apiKey = request.headers.get("authorization") || request.nextUrl.searchParams.get("apiKey");

  if (process.env.CRON_API_KEY !== apiKey) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const pageSize = 90; // Adjust this value based on the total number of teams and the available processing time

  let { page: pageNumber } = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));

  const firstDateOfMonth = new Date();
  firstDateOfMonth.setDate(1);

  while (true) {
    const teams = await prisma.team.findMany({
      where: {
        slug: {
          not: null,
        },
        createdAt: {
          // created before or on the first day of this month
          lte: firstDateOfMonth,
        },
      },
      select: {
        id: true,
        createdAt: true,
        members: true,
        name: true,
      },
      skip: pageNumber * pageSize,
      take: pageSize,
    });

    if (teams.length === 0) {
      break;
    }

    for (const team of teams) {
      const EventData: {
        Created: number;
        Completed: number;
        Rescheduled: number;
        Cancelled: number;
        mostBookedEvents: {
          eventTypeId?: number | null;
          eventTypeName?: string | null;
          count?: number | null;
        }[];
        membersWithMostBookings: {
          userId: number | null;
          user: {
            id: number;
            name: string | null;
            email: string;
            avatar: string | null;
            username: string | null;
          };
          count: number;
        }[];
        admin: { email: string; name: string };
        team: {
          name: string;
          id: number;
        };
      } = {
        Created: 0,
        Completed: 0,
        Rescheduled: 0,
        Cancelled: 0,
        mostBookedEvents: [],
        membersWithMostBookings: [],
        admin: { email: "", name: "" },
        team: { name: team.name, id: team.id },
      };

      const userIdsFromTeams = team.members.map((u) => u.userId);

      // Booking Events
      const whereConditional: Prisma.BookingTimeStatusDenormalizedWhereInput = {
        OR: [
          {
            teamId: team.id,
            isTeamBooking: true,
          },
          {
            userId: {
              in: userIdsFromTeams,
            },
            isTeamBooking: false,
          },
        ],
        createdAt: {
          gte: dayjs(firstDateOfMonth).toISOString(),
          lte: dayjs(new Date()).toISOString(),
        },
      };

      const countGroupedByStatus = await EventsInsights.countGroupedByStatus(whereConditional);

      EventData["Created"] = countGroupedByStatus["_all"];
      EventData["Completed"] = countGroupedByStatus["completed"];
      EventData["Rescheduled"] = countGroupedByStatus["rescheduled"];
      EventData["Cancelled"] = countGroupedByStatus["cancelled"];

      // Most Booked Event Type
      const bookingWhere: Prisma.BookingTimeStatusDenormalizedWhereInput = {
        createdAt: {
          gte: dayjs(firstDateOfMonth).startOf("day").toDate(),
          lte: dayjs(new Date()).endOf("day").toDate(),
        },
        OR: [
          {
            teamId: team.id,
            isTeamBooking: true,
          },
          {
            userId: {
              in: userIdsFromTeams,
            },
            isTeamBooking: false,
          },
        ],
      };

      const bookingsFromSelected = await prisma.bookingTimeStatusDenormalized.groupBy({
        by: ["eventTypeId"],
        where: bookingWhere,
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
        take: 10,
      });

      const eventTypeIds = bookingsFromSelected.reduce((acc: number[], booking) => {
        if (typeof booking.eventTypeId !== "number") return acc;
        return [...acc, booking.eventTypeId];
      }, []);

      const eventTypeWhereConditional: Prisma.EventTypeWhereInput = {
        id: {
          in: eventTypeIds,
        },
      };

      const eventTypesFrom = await prisma.eventType.findMany({
        select: {
          id: true,
          title: true,
          teamId: true,
          userId: true,
          slug: true,
          users: {
            select: {
              username: true,
            },
          },
          team: {
            select: {
              slug: true,
            },
          },
        },
        where: eventTypeWhereConditional,
      });

      const eventTypeHashMap: Map<
        number,
        Prisma.EventTypeGetPayload<{
          select: {
            id: true;
            title: true;
            teamId: true;
            userId: true;
            slug: true;
            users: {
              select: {
                username: true;
              };
            };
            team: {
              select: {
                slug: true;
              };
            };
          };
        }>
      > = new Map();
      eventTypesFrom.forEach((eventType) => {
        eventTypeHashMap.set(eventType.id, eventType);
      });

      EventData["mostBookedEvents"] = bookingsFromSelected.map((booking) => {
        const eventTypeSelected = eventTypeHashMap.get(booking.eventTypeId ?? 0);
        if (!eventTypeSelected) {
          return {};
        }

        let eventSlug = "";
        if (eventTypeSelected.userId) {
          eventSlug = `${eventTypeSelected?.users[0]?.username}/${eventTypeSelected?.slug}`;
        }
        if (eventTypeSelected?.team && eventTypeSelected?.team?.slug) {
          eventSlug = `${eventTypeSelected.team.slug}/${eventTypeSelected.slug}`;
        }
        return {
          eventTypeId: booking.eventTypeId,
          eventTypeName: eventSlug,
          count: booking._count.id,
        };
      });

      // Most booked members
      const bookingsFromTeam = await prisma.bookingTimeStatusDenormalized.groupBy({
        by: ["userId"],
        where: bookingWhere,
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
        take: 10,
      });

      const userIds = bookingsFromTeam
        .filter((booking) => typeof booking.userId === "number")
        .map((booking) => booking.userId);

      if (userIds.length === 0) {
        EventData["membersWithMostBookings"] = [];
      } else {
        const teamUsers = await prisma.user.findMany({
          where: {
            id: {
              in: userIds as number[],
            },
          },
          select: { id: true, name: true, email: true, avatarUrl: true, username: true },
        });

        const userHashMap = new Map();
        teamUsers.forEach((user) => {
          userHashMap.set(user.id, user);
        });

        EventData["membersWithMostBookings"] = bookingsFromTeam.map((booking) => {
          return {
            userId: booking.userId,
            user: userHashMap.get(booking.userId),
            count: booking._count.id,
          };
        });
      }

      // Send mail to all Owners and Admins
      const mailReceivers = team?.members?.filter(
        (member) => member.role === "OWNER" || member.role === "ADMIN"
      );

      const mailsToSend = mailReceivers.map(async (receiver) => {
        const owner = await prisma.user.findUnique({
          where: {
            id: receiver?.userId,
          },
        });

        if (owner) {
          const t = await getTranslation(owner?.locale ?? "en", "common");

          // Only send email if user has allowed to receive monthly digest emails
          if (owner.receiveMonthlyDigestEmail) {
            await sendMonthlyDigestEmail({
              ...EventData,
              admin: { email: owner?.email ?? "", name: owner?.name ?? "" },
              language: t,
            });
          }
        }
      });

      await Promise.all(mailsToSend);

      await delay(100); // Adjust the delay as needed to avoid rate limiting
    }

    pageNumber++;
  }

  return NextResponse.json({ ok: true });
}

export const POST = defaultResponderForAppDir(postHandler);
