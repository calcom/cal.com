import { NonRetriableError } from "inngest";
import type { createStepTools } from "inngest/components/InngestStepTools";
import type { Logger } from "inngest/middleware/logger";

import dayjs from "@calcom/dayjs";
import { sendBookingsExportEmail } from "@calcom/emails";
import type { BookingExportEmailProps } from "@calcom/emails/src/templates/BookingExportEmail";
import { INNGEST_ID } from "@calcom/lib/constants";
import { formatTime } from "@calcom/lib/date-fns";
import type { PrismaClient } from "@calcom/prisma";
import { prisma } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";
import { inngestClient } from "@calcom/web/pages/api/inngest";

import { getTranslation } from "./../../../../../lib/server/i18n";
import type { TExportInputSchema } from "./export.schema";

type ExportOptions = {
  ctx: {
    user: {
      id: number;
      name: string | null;
      email: string;
      timeZone: string;
      timeFormat: number | null;
      locale: string;
    };
    prisma: PrismaClient;
  };
  input: TExportInputSchema;
};

export const exportHandler = async ({ ctx, input }: ExportOptions) => {
  // using offset actually because cursor pagination requires a unique column
  // for orderBy, but we don't use a unique column in our orderBy
  const {
    user: { id, email, timeFormat, timeZone, locale, name },
  } = ctx;
  const t = await getTranslation(locale ?? "en", "common");

  const key = INNGEST_ID === "onehash-cal" ? "prod" : "stag";

  await inngestClient.send({
    name: `core/export-bookings-${key}`,
    data: {
      user: { id, name, email, timeFormat, timeZone },
      filters: input.filters,
    },
  });

  return { message: t("export_booking_response") };
};

const set = new Set();
const getUniqueBookings = <T extends { uid: string }>(arr: T[]) => {
  const unique = arr.filter((booking) => {
    const duplicate = set.has(booking.uid);
    set.add(booking.uid);
    return !duplicate;
  });
  set.clear();
  return unique;
};

const getTypeAndStartDate = (booking: any, timeZone: string) => {
  const endTime = dayjs(booking.endTime).tz(timeZone);
  const isUpcoming = endTime >= dayjs().tz(timeZone);
  let type;
  let startDate: string;

  if (isUpcoming) {
    type =
      booking.status === BookingStatus.PENDING
        ? "Unconfirmed"
        : booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.REJECTED
        ? "Cancelled"
        : booking.recurringEventId !== null
        ? "Recurring"
        : "Upcoming";

    startDate = dayjs(booking.startTime).tz(timeZone).locale("en").format("ddd, D MMM");
  } else {
    type =
      booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.REJECTED
        ? "Cancelled"
        : "Past";

    startDate = dayjs(booking.startTime).tz(timeZone).locale("en").format("D MMMM YYYY");
  }

  return { type, startDate };
};
const formatLocation = (location: string | null) => {
  if (location == null) return "N/A";
  const cleanLocation = location.includes("integrations:")
    ? location
        .replace("integrations:", "")
        .split(":")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ")
        .trim()
    : location;

  return cleanLocation.includes("\n") ? cleanLocation.replace("\n", " ").trim() : cleanLocation;
};

export async function handleBookingExportEvent({
  user,
  filters,
  step,
  logger,
}: {
  user: { id: number; name: string | null; email: string; timeFormat: number | null; timeZone: string };
  filters: TExportInputSchema["filters"];
  step: ReturnType<typeof createStepTools>;
  logger: Logger;
}) {
  try {
    const orderBy = { startTime: Prisma.SortOrder.asc };

    // TODO: Fix record typing
    const bookingWhereInputFilters: Record<string, Prisma.BookingWhereInput> = {
      teamIds: {
        AND: [
          {
            eventType: {
              team: {
                id: {
                  in: filters?.teamIds,
                },
              },
            },
          },
        ],
      },
      userIds: {
        AND: [
          {
            OR: [
              {
                eventType: {
                  hosts: {
                    some: {
                      userId: {
                        in: filters?.userIds,
                      },
                    },
                  },
                },
              },
              {
                userId: {
                  in: filters?.userIds,
                },
              },
              {
                eventType: {
                  users: {
                    some: {
                      id: {
                        in: filters?.userIds,
                      },
                    },
                  },
                },
              },
            ],
          },
        ],
      },
      eventTypeIds: {
        AND: [
          {
            eventTypeId: {
              in: filters?.eventTypeIds,
            },
          },
        ],
      },
      attendees: {
        AND: [
          {
            attendees: {
              some: {
                name: {
                  in: filters?.attendees,
                },
              },
            },
          },
        ],
      },
      ...(filters.afterStartDate && {
        afterStartDate: {
          AND: [
            {
              startTime: {
                gte: new Date(filters.afterStartDate),
              },
            },
          ],
        },
      }),
      ...(filters.beforeEndDate && {
        beforeEndDate: {
          AND: [
            {
              endTime: {
                lte: new Date(filters.beforeEndDate),
              },
            },
          ],
        },
      }),
    };

    const filtersCombined: Prisma.BookingWhereInput[] = !filters
      ? []
      : Object.keys(filters)
          .map((key) => bookingWhereInputFilters[key])
          // On prisma 5.4.2 passing undefined to where "AND" causes an error
          .filter(Boolean);

    const bookingSelect = {
      id: true,
      title: true,
      userPrimaryEmail: true,
      description: true,
      customInputs: true,
      startTime: true,
      endTime: true,
      responses: true,
      metadata: true,
      status: true,
      recurringEventId: true,
      location: true,
      paid: true,
      rescheduled: true,
      isRecorded: true,
      attendees: {
        select: {
          email: true,
        },
      },
      payment: {
        select: {
          paymentOption: true,
          amount: true,
          currency: true,
          success: true,
        },
      },
      eventType: {
        select: {
          title: true,
        },
      },
    };

    const [
      // Quering these in parallel to save time.
      // Note that because we are applying `take` to individual queries, we will usually get more bookings then we need. It is okay to have more bookings faster than having what we need slower
      bookingsQueryUserId,
      bookingsQueryAttendees,
      bookingsQueryTeamMember,
      bookingsQuerySeatReference,
      //////////////////////////

      // We need all promises to be successful, so we are not using Promise.allSettled
    ] = await step.run(`Fetching all bookings for user with ID ${user.id}`, async () => {
      try {
        return await Promise.all([
          prisma.booking.findMany({
            where: {
              OR: [
                {
                  userId: user.id,
                },
              ],
              AND: [...filtersCombined],
            },
            orderBy,
          }),
          prisma.booking.findMany({
            where: {
              OR: [
                {
                  attendees: {
                    some: {
                      email: user.email,
                    },
                  },
                },
              ],
              AND: [...filtersCombined],
            },
            orderBy,
          }),
          prisma.booking.findMany({
            where: {
              OR: [
                {
                  eventType: {
                    team: {
                      members: {
                        some: {
                          userId: user.id,
                          role: {
                            in: ["ADMIN", "OWNER"],
                          },
                        },
                      },
                    },
                  },
                },
              ],
              AND: [...filtersCombined],
            },
            orderBy,
          }),
          prisma.booking.findMany({
            where: {
              OR: [
                {
                  seatsReferences: {
                    some: {
                      attendee: {
                        email: user.email,
                      },
                    },
                  },
                },
              ],
              AND: [...filtersCombined],
            },
            orderBy,
          }),
          prisma.booking.groupBy({
            by: ["recurringEventId"],
            _min: {
              startTime: true,
            },
            _count: {
              recurringEventId: true,
            },
            where: {
              recurringEventId: {
                not: { equals: null },
              },
              userId: user.id,
            },
          }),
          prisma.booking.groupBy({
            by: ["recurringEventId", "status", "startTime"],
            _min: {
              startTime: true,
            },
            where: {
              recurringEventId: {
                not: { equals: null },
              },
              userId: user.id,
            },
          }),
        ]);
      } catch (error) {
        throw new Error(`Error - Fetching all bookings : ${error instanceof Error ? error.message : error}`);
      }
    });

    const plainBookings = getUniqueBookings(
      // It's going to mess up the orderBy as we are concatenating independent queries results
      bookingsQueryUserId
        .concat(bookingsQueryAttendees)
        .concat(bookingsQueryTeamMember)
        .concat(bookingsQuerySeatReference)
    );

    // Now enrich bookings with relation data. We could have queried the relation data along with the bookings, but that would cause unnecessary queries to the database.
    // Because Prisma is also going to query the select relation data sequentially, we are fine querying it separately here as it would be just 1 query instead of 4
    const bookings = await step.run(`Enriching Fetched Bookings for user with ID ${user.id}`, async () => {
      try {
        const _bookings = (
          await prisma.booking.findMany({
            where: {
              id: {
                in: plainBookings.map((booking) => booking.id),
              },
            },
            select: bookingSelect,
            // We need to get the sorted bookings here as well because plainBookings array is not correctly sorted
            orderBy,
          })
        ).map((booking) => {
          return {
            ...booking,
            startTime: booking.startTime.toISOString(),
            endTime: booking.endTime.toISOString(),
          };
        });
        return _bookings;
      } catch (error) {
        throw new Error(`Error - Fetching all bookings : ${error instanceof Error ? error.message : error}`);
      }
    });

    const allBookingsWithType = await step.run(
      `Formatting bookings with additional types for user with ID ${user.id}`,
      () => {
        return bookings.map((booking) => {
          const { type, startDate } = getTypeAndStartDate(booking, user.timeZone);

          const interval = `${formatTime(
            booking.startTime,
            user?.timeFormat,
            user?.timeZone
          )} to ${formatTime(booking.endTime, user?.timeFormat, user?.timeZone)}`;

          return {
            ...booking,
            type,
            startDate: `"${startDate}"`,
            interval,
            description: `"${booking.description}"`,
            location: formatLocation(booking.location),
          };
        });
      }
    );

    const header = [
      "ID",
      "Title",
      "Description",
      "Status",
      "Event",
      "Date",
      "Interval",
      "Location",
      "Attendees",
      "Paid",
      "Currency",
      "Amount",
      "Payment Status",
      "Rescheduled",
      "Recurring Event ID",
      "Is Recorded",
      "Responses",
    ];

    function csvSafe(val) {
      if (val == null) return "";
      const stringVal = String(val);
      // Only wrap and escape if necessary
      if (stringVal.includes('"')) {
        // Escape internal double quotes per CSV standard
        return `"${stringVal.replace(/"/g, '""')}"`;
      }
      if (stringVal.includes(",") || stringVal.includes("\n")) {
        return `"${stringVal}"`;
      }
      return stringVal;
    }

    const csvData = allBookingsWithType.map((booking) => [
      booking.id,
      booking.title,
      booking.description,
      booking.type,
      booking.eventType?.title ?? "",
      booking.startDate,
      booking.interval,
      booking.location,
      booking.attendees?.map((attendee) => attendee.email).join(";"),
      booking.paid?.toString(),
      booking.payment?.map((pay) => pay.currency).join(";"),
      booking.payment?.map((pay) => pay.amount / 100).join(";"),
      booking.payment?.map((pay) => pay.success).join(";"),
      booking.rescheduled?.toString() ?? "",
      booking.recurringEventId ?? "",
      booking.isRecorded?.toString(),
      csvSafe(JSON.stringify({ data: booking.responses })),
    ]);

    const csvContent = [header.join(","), ...csvData.map((row) => row.join(","))].join("\n");

    console.log("CSV Content Generated: ", csvContent);

    await step.run(`Send export booking email for user with ID ${user.id}`, async () => {
      try {
        const data: BookingExportEmailProps = {
          receiverEmail: user.email,
          user: {
            fullName: user.name ?? "",
          },
          csvContent: csvContent,
        };
        await sendBookingsExportEmail(data);
      } catch (error) {
        throw new NonRetriableError(
          `Error - Sending export booking email : ${error instanceof Error ? error.message : error}`
        );
      }
    });

    return;
  } catch (error) {
    throw new Error(`Error - Exporting bookings: ${error instanceof Error ? error.message : error}`);
  }
}
