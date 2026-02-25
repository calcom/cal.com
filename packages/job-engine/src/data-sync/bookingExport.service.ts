import type { WorkflowContext } from "@calid/job-dispatcher";

import dayjs from "@calcom/dayjs";
import { sendBookingsExportEmail } from "@calcom/emails";
import type { BookingExportEmailProps } from "@calcom/emails/src/templates/BookingExportEmail";
import { formatTime } from "@calcom/lib/date-fns";
import { prisma } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";

import type { BookingExportJobData } from "./type";

// ============================================================================
// TYPES
// ============================================================================

type BookingWithRelations = {
  id: number;
  title: string;
  userPrimaryEmail: string | null;
  description: string | null;
  customInputs: unknown;
  startTime: string;
  endTime: string;
  responses: unknown;
  metadata: unknown;
  status: BookingStatus;
  recurringEventId: string | null;
  location: string | null;
  paid: boolean;
  rescheduled: boolean | null;
  isRecorded: boolean;
  attendees: {
    email: string;
  }[];
  payment: {
    paymentOption: string | null;
    amount: number;
    currency: string;
    success: boolean;
  }[];
  eventType: {
    title: string;
  } | null;
};

type BookingWithType = BookingWithRelations & {
  type: string;
  startDate: string;
  interval: string;
};

type BookingWithSeats = BookingWithType & {
  bookingSeats?: {
    referenceUid: string;
    data: unknown;
    metadata: unknown;
    createdAt: Date;
    payment: {
      amount: number;
      fee: number;
      currency: string;
      success: boolean;
      refunded: boolean;
    } | null;
  }[];
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

const getTypeAndStartDate = (booking: BookingWithRelations, timeZone: string) => {
  const endTime = dayjs(booking.endTime).tz(timeZone);
  const isUpcoming = endTime >= dayjs().tz(timeZone);
  let type: string;
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

function csvSafe(val: unknown): string {
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

// ============================================================================
// MAIN WORKFLOW EXPORT
// ============================================================================

export async function bookingExportService(
  ctx: WorkflowContext,
  payload: BookingExportJobData
): Promise<void> {
  const { user, filters } = payload;

  try {
    ctx.log(`Starting booking export for user ID: ${user.id}`);

    const orderBy = { startTime: Prisma.SortOrder.asc };

    // Build where input filters
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
      ...(filters?.afterStartDate && {
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
      ...(filters?.beforeEndDate && {
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
          .filter(Boolean);

    // Step 1: Fetch all bookings in parallel
    const [bookingsQueryUserId, bookingsQueryAttendees, bookingsQueryTeamMember, bookingsQuerySeatReference] =
      await ctx.run(`fetch-all-bookings-user-${user.id}`, async () => {
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
          ]);
        } catch (error) {
          throw new Error(`Fetching bookings failed: ${error instanceof Error ? error.message : error}`);
        }
      });

    ctx.log(
      `Fetched ${
        bookingsQueryUserId.length +
        bookingsQueryAttendees.length +
        bookingsQueryTeamMember.length +
        bookingsQuerySeatReference.length
      } total bookings`
    );

    const plainBookings = getUniqueBookings(
      bookingsQueryUserId
        .concat(bookingsQueryAttendees)
        .concat(bookingsQueryTeamMember)
        .concat(bookingsQuerySeatReference)
    );

    ctx.log(`Found ${plainBookings.length} unique bookings`);

    // Step 2: Enrich bookings with relation data
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

    const bookings = await ctx.run(`enrich-bookings-user-${user.id}`, async () => {
      try {
        const _bookings = (
          await prisma.booking.findMany({
            where: {
              id: {
                in: plainBookings.map((booking) => booking.id),
              },
            },
            select: bookingSelect,
            orderBy,
          })
        ).map((booking) => {
          return {
            ...booking,
            startTime: booking.startTime.toISOString(),
            endTime: booking.endTime.toISOString(),
          };
        });
        return _bookings as BookingWithRelations[];
      } catch (error) {
        throw new Error(`Enriching bookings failed: ${error instanceof Error ? error.message : error}`);
      }
    });

    ctx.log(`Enriched ${bookings.length} bookings with relations`);

    // Step 3: Format bookings with additional type information
    const allBookingsWithType = await ctx.run(`format-bookings-user-${user.id}`, async () => {
      return bookings.map((booking) => {
        const { type, startDate } = getTypeAndStartDate(booking, user.timeZone);

        const interval = `${formatTime(booking.startTime, user?.timeFormat, user?.timeZone)} to ${formatTime(
          booking.endTime,
          user?.timeFormat,
          user?.timeZone
        )}`;

        return {
          ...booking,
          type,
          startDate: `"${startDate}"`,
          interval,
          description: `"${booking.description}"`,
          location: formatLocation(booking.location),
        };
      }) as BookingWithType[];
    });

    ctx.log(`Formatted ${allBookingsWithType.length} bookings with type data`);

    // Step 4: Associate booking seats
    const allBookingsWithSeats = await ctx.run(`associate-seats-user-${user.id}`, async () => {
      return Promise.all(
        allBookingsWithType.map(async (booking) => {
          const seatReferences = await prisma.bookingSeat.findMany({
            where: {
              bookingId: booking.id,
            },
            select: {
              referenceUid: true,
              data: true,
              metadata: true,
              createdAt: true,
              payment: {
                select: {
                  amount: true,
                  fee: true,
                  currency: true,
                  success: true,
                  refunded: true,
                },
              },
            },
          });

          if (seatReferences.length === 0) {
            return booking;
          }

          return {
            ...booking,
            bookingSeats: [...seatReferences],
          };
        })
      ) as Promise<BookingWithSeats[]>;
    });

    ctx.log(`Associated seats for ${allBookingsWithSeats.length} bookings`);

    // Step 5: Generate CSV
    const csvContent = await ctx.run(`generate-csv-user-${user.id}`, async () => {
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

      const csvData = allBookingsWithSeats.map((booking) => [
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
        booking.responses
          ? csvSafe(JSON.stringify({ data: booking.responses }))
          : csvSafe(JSON.stringify({ data: booking.bookingSeats ?? [] })),
      ]);

      return [header.join(","), ...csvData.map((row) => row.join(","))].join("\n");
    });

    ctx.log(`Generated CSV content with ${allBookingsWithSeats.length} rows`);

    // Step 6: Send export email
    await ctx.run(`send-export-email-user-${user.id}`, async () => {
      try {
        const data: BookingExportEmailProps = {
          receiverEmail: user.email,
          user: {
            fullName: user.name ?? "",
          },
          csvContent: csvContent,
        };
        await sendBookingsExportEmail(data);
        ctx.log(`Export email sent to ${user.email}`);
      } catch (error) {
        throw new Error(`Sending export email failed: ${error instanceof Error ? error.message : error}`);
      }
    });

    ctx.log("Booking export completed successfully");
  } catch (error) {
    ctx.log(`Booking export failed: ${error instanceof Error ? error.message : error}`, "error");
    throw new Error(`Booking export failed: ${error instanceof Error ? error.message : error}`);
  }
}
