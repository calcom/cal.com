import type { Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { sendMonthlyDigestEmails } from "@calcom/emails/email-manager";
import { EventsInsights } from "@calcom/features/insights/server/events";
import { getTranslation } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

const querySchema = z.object({
  page: z.coerce.number().min(0).optional().default(0),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers.authorization || req.query.apiKey;

  if (process.env.CRON_API_KEY !== apiKey) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ message: "Invalid method" });
    return;
  }

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const pageSize = 90; // Adjust this value based on the total number of teams and the available processing time
  let { page: pageNumber } = querySchema.parse(req.query);

  const date30DaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));

  while (true) {
    const teams = await prisma.team.findMany({
      where: {
        slug: {
          not: null,
        },
        createdAt: {
          // created before last 30days
          lte: date30DaysAgo,
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
      const createdAt = team.createdAt;

      // Setting both times to midnight as we will only compare the days
      date30DaysAgo.setHours(0, 0, 0, 0);
      createdAt.setHours(0, 0, 0, 0);

      // Calculate the difference in milliseconds between createdAt and date30DaysAgo
      const timeDifference = date30DaysAgo.getTime() - createdAt.getTime();

      // Calculate the difference in days
      const daysDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24));

      // If the daysDifference is a multiple of 30
      if (daysDifference % 30 === 0) {
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
        const whereConditional: Prisma.BookingTimeStatusWhereInput = {
          OR: [
            {
              teamId: team.id,
            },
            {
              userId: {
                in: userIdsFromTeams,
              },
              teamId: null,
            },
          ],
        };

        const promisesResult = await Promise.all([
          EventsInsights.getCreatedEventsInTimeRange(
            {
              start: dayjs(date30DaysAgo),
              end: dayjs(new Date()),
            },
            whereConditional
          ),
          EventsInsights.getCompletedEventsInTimeRange(
            {
              start: dayjs(date30DaysAgo),
              end: dayjs(new Date()),
            },
            whereConditional
          ),
          EventsInsights.getRescheduledEventsInTimeRange(
            {
              start: dayjs(date30DaysAgo),
              end: dayjs(new Date()),
            },
            whereConditional
          ),
          EventsInsights.getCancelledEventsInTimeRange(
            {
              start: dayjs(date30DaysAgo),
              end: dayjs(new Date()),
            },
            whereConditional
          ),
        ]);
        EventData["Created"] = promisesResult[0];
        EventData["Completed"] = promisesResult[1];
        EventData["Rescheduled"] = promisesResult[2];
        EventData["Cancelled"] = promisesResult[3];

        // Most Booked Event Type
        const bookingWhere: Prisma.BookingTimeStatusWhereInput = {
          createdAt: {
            gte: dayjs(date30DaysAgo).startOf("day").toDate(),
            lte: dayjs(new Date()).endOf("day").toDate(),
          },
          OR: [
            {
              teamId: team.id,
            },
            {
              userId: {
                in: userIdsFromTeams,
              },
              teamId: null,
            },
          ],
        };

        const bookingsFromSelected = await prisma.bookingTimeStatus.groupBy({
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

        const eventTypeIds = bookingsFromSelected
          .filter((booking) => typeof booking.eventTypeId === "number")
          .map((booking) => booking.eventTypeId);

        const eventTypeWhereConditional: Prisma.EventTypeWhereInput = {
          id: {
            in: eventTypeIds as number[],
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
        const bookingsFromTeam = await prisma.bookingTimeStatus.groupBy({
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
            select: { id: true, name: true, email: true, avatar: true, username: true },
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
            EventData["admin"] = { email: owner?.email ?? "", name: owner?.name ?? "" };

            const t = await getTranslation(owner?.locale ?? "en", "common");

            // Only send email if user has allowed to receive monthly digest emails
            if (owner.receiveMonthlyDigestEmail) {
              await sendMonthlyDigestEmails({ ...EventData, language: t });
            }
          }
        });

        await Promise.all(mailsToSend);
      }

      await delay(100); // Adjust the delay as needed to avoid rate limiting
    }

    pageNumber++;
  }
  res.json({ ok: true });
}
