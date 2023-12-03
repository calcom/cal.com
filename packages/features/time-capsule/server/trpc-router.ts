import dayjs from "@calcom/dayjs";
import authedProcedure from "@calcom/trpc/server/procedures/authedProcedure";
import { router } from "@calcom/trpc/server/trpc";

const procedure = authedProcedure.use(async ({ ctx, next }) => {
  return next({
    ctx: {
      ...ctx,
      user: {
        ...ctx.user,
      },
    },
  });
});

//   return next();
// });

export const timeCapsuleRouter = router({
  totalMinutes: procedure.query(async ({ ctx }) => {
    const myBookings = await ctx.insightsDb.booking.findMany({
      where: {
        userId: ctx.user.id,
        startTime: {
          gte: new Date("01/01/2023"),
          lte: new Date("01/01/2024"),
        },
        status: "ACCEPTED",
      },
      select: {
        eventType: {
          select: {
            length: true,
            title: true,
            slug: true,
          },
        },
        attendees: true,
        startTime: true,
      },
    });
    const totalMinutes = myBookings?.reduce((acc, val) => acc + (val?.eventType?.length ?? 0), 0);
    const totalMeetings = myBookings?.length;
    const averageMinutes = Math.round(totalMinutes / totalMeetings);

    return { totalMinutes, totalMeetings, averageMinutes };
  }),
  totalAttendees: procedure.query(async ({ ctx }) => {
    const myBookings = await ctx.insightsDb.booking.findMany({
      where: {
        userId: ctx.user.id,
        startTime: {
          gte: new Date("01/01/2023"),
          lte: new Date("01/01/2024"),
        },
        status: "ACCEPTED",
      },
      select: {
        eventType: {
          select: {
            length: true,
            title: true,
            slug: true,
          },
        },
        attendees: true,
        startTime: true,
      },
    });
    const attendeeMinutes: { name: string; email: string; minutes: number }[] = [];
    myBookings.forEach((booking) => {
      booking.attendees.forEach((attendee) => {
        const index = attendeeMinutes.findIndex((att) => attendee.email == att.email);
        if (index >= 0) {
          attendeeMinutes[index] = {
            ...attendeeMinutes[index],
            minutes: attendeeMinutes[index]["minutes"] + (booking.eventType?.length ?? 0),
          };
        } else {
          attendeeMinutes.push({
            name: attendee.name,
            email: attendee.email,
            minutes: booking.eventType?.length ?? 0,
          });
        }
      });
    });
    const topAttendees = attendeeMinutes.sort((a, b) => b["minutes"] - a["minutes"]).slice(0, 5);
    const uniqueAttendees = new Set(
      myBookings?.map((booking) => booking.attendees.map((attendee) => attendee.email).flat()).flat()
    ).size;
    return { topAttendees, uniqueAttendees };
  }),
  calendar: procedure.query(async ({ ctx }) => {
    const myBookings = await ctx.insightsDb.booking.findMany({
      where: {
        userId: ctx.user.id,
        startTime: {
          gte: new Date("01/01/2023"),
          lte: new Date("01/01/2024"),
        },
        status: "ACCEPTED",
      },
      select: {
        eventType: {
          select: {
            length: true,
            title: true,
            slug: true,
          },
        },
        attendees: true,
        startTime: true,
      },
    });
    const months = [
      {
        Month: "January",
        Minutes: 0,
      },
      {
        Month: "February",
        Minutes: 0,
      },
      {
        Month: "March",
        Minutes: 0,
      },
      {
        Month: "April",
        Minutes: 0,
      },
      {
        Month: "May",
        Minutes: 0,
      },
      {
        Month: "June",
        Minutes: 0,
      },
      {
        Month: "July",
        Minutes: 0,
      },
      {
        Month: "August",
        Minutes: 0,
      },
      {
        Month: "September",
        Minutes: 0,
      },
      {
        Month: "October",
        Minutes: 0,
      },
      {
        Month: "November",
        Minutes: 0,
      },
      {
        Month: "December",
        Minutes: 0,
      },
    ];

    const daysOfWeek = [
      {
        Month: "Sunday",
        Minutes: 0,
      },
      {
        Month: "Monday",
        Minutes: 0,
      },
      {
        Month: "Tuesday",
        Minutes: 0,
      },
      {
        Month: "Wednesday",
        Minutes: 0,
      },
      {
        Month: "Thursday",
        Minutes: 0,
      },
      {
        Month: "Friday",
        Minutes: 0,
      },
      {
        Month: "Saturday",
        Minutes: 0,
      },
    ];
    const daysOfYear = Array.from({ length: 365 }, (_, i) => [i, 0]);
    const hoursOfDay = {
      "Early Morning": 0,
      Afternoon: 0,
      Night: 0,
      Nocturnal: 0,
    };

    myBookings.forEach((booking) => {
      const startTime = dayjs(booking.startTime);
      const bookingLength = booking?.eventType?.length;
      if (bookingLength && startTime) {
        const month = startTime.month();
        months[month]["Minutes"] += bookingLength;

        const dayOfWeek = startTime.day();
        daysOfWeek[dayOfWeek]["Minutes"] += bookingLength;

        const dayOfYear = startTime.dayOfYear();
        daysOfYear[dayOfYear] = [
          daysOfYear[dayOfYear][0],
          (daysOfYear[dayOfYear][1] as number) + (booking.eventType?.length ?? 0),
        ];

        const hourOfDay = startTime.hour();
        if (bookingLength) {
          if (hourOfDay == 23 || hourOfDay <= 4) {
            hoursOfDay["Early Morning"] = hoursOfDay["Early Morning"] + bookingLength;
          } else if (hourOfDay >= 5 && hourOfDay <= 10) {
            hoursOfDay["Afternoon"] = hoursOfDay["Afternoon"] + bookingLength;
          } else if (hourOfDay >= 11 && hourOfDay <= 16) {
            hoursOfDay["Night"] = hoursOfDay["Night"] + bookingLength;
          } else if (hourOfDay >= 17 && hourOfDay <= 22) {
            hoursOfDay["Nocturnal"] = hoursOfDay["Nocturnal"] + bookingLength;
          }
        }
      }
    });
    const topDay = [...daysOfYear].sort((a, b) => b[1] - a[1])[0];
    const topMonth = [...months].sort((a, b) => b["Minutes"] - a["Minutes"])[0];
    const topDayOfWeek = [...daysOfWeek].sort((a, b) => b["Minutes"] - a["Minutes"])[0];

    let topTimeOfDay = ["", 0];
    Object.keys(hoursOfDay).forEach((hour) => {
      if (hoursOfDay[hour as keyof typeof hoursOfDay] > (topTimeOfDay[1] as number)) {
        topTimeOfDay = [hour, hoursOfDay[hour as keyof typeof hoursOfDay]];
      }
    });

    let meetingStreak = 0;
    let meetingStreakStart = 0;
    let currMeetingStreak = 0;
    let currStreakStart = 0;
    daysOfYear.forEach((day) => {
      const val = day[1];
      if (val != 0) {
        if (currMeetingStreak == 0) {
          currStreakStart = day[0];
        }
        currMeetingStreak++;
      } else {
        if (currMeetingStreak > meetingStreak) {
          meetingStreakStart = currStreakStart;
          meetingStreak = currMeetingStreak;
        }
        currMeetingStreak = 0;
        currStreakStart = 0;
      }
    });
    return {
      months,
      daysOfWeek,
      daysOfYear,
      hoursOfDay,
      topDay,
      topMonth,
      topDayOfWeek,
      topTimeOfDay,
      meetingStreak,
      meetingStreakStart,
    };
  }),
  workflows: procedure.query(async ({ ctx }) => {
    const myWorkflows = await ctx.insightsDb.workflow.findMany({
      where: {
        userId: ctx.user.id,
      },
      select: {
        id: true,
        name: true,
      },
    });

    const totalWorkflows = myWorkflows.length;
    return { totalWorkflows };
  }),
  eventTypes: procedure.query(async ({ ctx }) => {
    const myBookings = await ctx.insightsDb.booking.findMany({
      where: {
        userId: ctx.user.id,
        startTime: {
          gte: new Date("01/01/2023"),
          lte: new Date("01/01/2024"),
        },
        status: "ACCEPTED",
      },
      select: {
        eventType: {
          select: {
            length: true,
            title: true,
            slug: true,
          },
        },
        attendees: true,
        startTime: true,
      },
    });
    let eventTypeMetrics: Record<string, number> = {};
    myBookings.forEach((booking) => {
      if (booking.eventType?.title) {
        if (eventTypeMetrics[booking.eventType?.title]) {
          eventTypeMetrics[booking.eventType?.title] = eventTypeMetrics[booking.eventType?.title] + 1;
        } else {
          eventTypeMetrics = { ...eventTypeMetrics, [booking.eventType?.title]: 1 };
        }
      }
    });
    const topEventTypes = Object.entries(eventTypeMetrics)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { topEventTypes };
  }),
  routingForms: procedure.query(async ({ ctx }) => {
    const myRoutingForms = await ctx.insightsDb.app_RoutingForms_Form.findMany({
      where: {
        userId: ctx.user.id,
      },
      include: {
        responses: true,
      },
    });

    const totalRoutingForms = myRoutingForms.length;
    const totalRoutingFormResponses = myRoutingForms.reduce((acc, form) => acc + form.responses.length, 0);
    let topRoutingFormResponses = myRoutingForms[0];
    myRoutingForms.forEach((form) => {
      if (form.responses.length > topRoutingFormResponses.responses.length) {
        topRoutingFormResponses = form;
      }
    });
    const topRoutingForm = [topRoutingFormResponses.name, topRoutingFormResponses.responses.length];
    return { totalRoutingForms, totalRoutingFormResponses, topRoutingForm };
  }),
  bookingStatuses: procedure.query(async ({ ctx }) => {
    const acceptedBookings = await ctx.insightsDb.booking.count({
      where: {
        userId: ctx.user.id,
        status: "ACCEPTED",
      },
    });
    const cancelledBookings = await ctx.insightsDb.booking.count({
      where: {
        userId: ctx.user.id,
        status: "CANCELLED",
        rescheduled: false,
      },
    });
    const rescheduledBookings = await ctx.insightsDb.booking.count({
      where: {
        userId: ctx.user.id,
        status: "CANCELLED",
        rescheduled: true,
      },
    });
    const rejectedBookings = await ctx.insightsDb.booking.count({
      where: {
        userId: ctx.user.id,
        status: "REJECTED",
      },
    });
    const bookingStatuses = {
      accepted: acceptedBookings,
      rejected: rejectedBookings,
      cancelled: cancelledBookings,
      rescheduled: rescheduledBookings,
    };
    return { bookingStatuses };
  }),
  //   eventsTimeline: userBelongsToTeamProcedure
  //     .input(
  //       z.object({
  //         teamId: z.coerce.number().optional().nullable(),
  //         startDate: z.string(),
  //         endDate: z.string(),
  //         eventTypeId: z.coerce.number().optional(),
  //         memberUserId: z.coerce.number().optional(),
  //         timeView: z.enum(["week", "month", "year", "day"]),
  //         userId: z.coerce.number().optional(),
  //         isAll: z.boolean().optional(),
  //       })
  //     )
  //     .query(async ({ ctx, input }) => {
  //       const {
  //         teamId,
  //         eventTypeId,
  //         memberUserId,
  //         isAll,
  //         startDate: startDateString,
  //         endDate: endDateString,
  //         timeView: inputTimeView,
  //         userId: selfUserId,
  //       } = input;

  //       const startDate = dayjs(startDateString);
  //       const endDate = dayjs(endDateString);
  //       const user = ctx.user;

  //       if (selfUserId && user?.id !== selfUserId) {
  //         throw new TRPCError({ code: "UNAUTHORIZED" });
  //       }

  //       if (!teamId && !selfUserId) {
  //         return [];
  //       }

  //       let timeView = inputTimeView;

  //       if (timeView === "week") {
  //         // Difference between start and end date is less than 14 days use day view
  //         if (endDate.diff(startDate, "day") < 14) {
  //           timeView = "day";
  //         }
  //       }

  //       let whereConditional: Prisma.BookingTimeStatusWhereInput = {};

  //       if (isAll && ctx.user.isOwnerAdminOfParentTeam && ctx.user.organizationId) {
  //         const teamsFromOrg = await ctx.insightsDb.team.findMany({
  //           where: {
  //             parentId: user.organizationId,
  //           },
  //           select: {
  //             id: true,
  //           },
  //         });

  //         const usersFromOrg = await ctx.insightsDb.membership.findMany({
  //           where: {
  //             teamId: {
  //               in: [ctx.user.organizationId, ...teamsFromOrg.map((t) => t.id)],
  //             },
  //             accepted: true,
  //           },
  //           select: {
  //             userId: true,
  //           },
  //         });
  //         const userIdsFromOrg = usersFromOrg.map((u) => u.userId);

  //         whereConditional = {
  //           OR: [
  //             {
  //               userId: {
  //                 in: userIdsFromOrg,
  //               },
  //               teamId: null,
  //             },
  //             {
  //               teamId: {
  //                 in: [ctx.user.organizationId, ...teamsFromOrg.map((t) => t.id)],
  //               },
  //             },
  //           ],
  //         };
  //       }

  //       if (teamId && !isAll) {
  //         const usersFromTeam = await ctx.insightsDb.membership.findMany({
  //           where: {
  //             teamId,
  //             accepted: true,
  //           },
  //           select: {
  //             userId: true,
  //           },
  //         });
  //         const userIdsFromTeams = usersFromTeam.map((u) => u.userId);

  //         whereConditional = {
  //           OR: [
  //             {
  //               teamId,
  //             },
  //             {
  //               userId: {
  //                 in: userIdsFromTeams,
  //               },
  //               teamId: null,
  //             },
  //           ],
  //         };
  //       }

  //       if (memberUserId) {
  //         whereConditional = {
  //           ...whereConditional,
  //           userId: memberUserId,
  //         };
  //       }

  //       if (eventTypeId && !!whereConditional) {
  //         whereConditional = {
  //           OR: [
  //             {
  //               eventTypeId,
  //             },
  //             {
  //               eventParentId: eventTypeId,
  //             },
  //           ],
  //         };
  //       }

  //       if (selfUserId && !!whereConditional) {
  //         // In this delete we are deleting the teamId filter
  //         whereConditional["userId"] = selfUserId;
  //         whereConditional["teamId"] = null;
  //       }

  //       // Get timeline data
  //       const timeline = await EventsInsights.getTimeLine(timeView, dayjs(startDate), dayjs(endDate));

  //       // iterate timeline and fetch data
  //       if (!timeline) {
  //         return [];
  //       }

  //       const dateFormat: string = timeView === "year" ? "YYYY" : timeView === "month" ? "MMM YYYY" : "ll";
  //       const result = [];

  //       for (const date of timeline) {
  //         const EventData = {
  //           Month: dayjs(date).format(dateFormat),
  //           Created: 0,
  //           Completed: 0,
  //           Rescheduled: 0,
  //           Cancelled: 0,
  //         };
  //         const startOfEndOf = timeView;
  //         let startDate = dayjs(date).startOf(startOfEndOf);
  //         let endDate = dayjs(date).endOf(startOfEndOf);
  //         if (timeView === "week") {
  //           startDate = dayjs(date).startOf("day");
  //           endDate = dayjs(date).add(6, "day").endOf("day");
  //         }
  //         const promisesResult = await Promise.all([
  //           EventsInsights.getCreatedEventsInTimeRange(
  //             {
  //               start: startDate,
  //               end: endDate,
  //             },
  //             whereConditional
  //           ),
  //           EventsInsights.getCompletedEventsInTimeRange(
  //             {
  //               start: startDate,
  //               end: endDate,
  //             },
  //             whereConditional
  //           ),
  //           EventsInsights.getRescheduledEventsInTimeRange(
  //             {
  //               start: startDate,
  //               end: endDate,
  //             },
  //             whereConditional
  //           ),
  //           EventsInsights.getCancelledEventsInTimeRange(
  //             {
  //               start: startDate,
  //               end: endDate,
  //             },
  //             whereConditional
  //           ),
  //         ]);
  //         EventData["Created"] = promisesResult[0];
  //         EventData["Completed"] = promisesResult[1];
  //         EventData["Rescheduled"] = promisesResult[2];
  //         EventData["Cancelled"] = promisesResult[3];
  //         result.push(EventData);
  //       }

  //       return result;
  //     }),

  //   rawData: userBelongsToTeamProcedure.input(rawDataInputSchema).query(async ({ ctx, input }) => {
  //     const { startDate, endDate, teamId, userId, memberUserId, isAll, eventTypeId } = input;

  //     const isOrgAdminOrOwner = ctx.user.isOwnerAdminOfParentTeam;
  //     try {
  //       // Get the data
  //       const csvData = await EventsInsights.getCsvData({
  //         startDate,
  //         endDate,
  //         teamId,
  //         userId,
  //         memberUserId,
  //         isAll,
  //         isOrgAdminOrOwner,
  //         eventTypeId,
  //         organizationId: ctx.user.organizationId || null,
  //       });

  //       const csvAsString = EventsInsights.objectToCsv(csvData);
  //       const downloadAs = `Insights-${dayjs(startDate).format("YYYY-MM-DD")}-${dayjs(endDate).format(
  //         "YYYY-MM-DD"
  //       )}-${randomString(10)}.csv`;

  //       return { data: csvAsString, filename: downloadAs };
  //     } catch (e) {
  //       throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  //     }
  //     return { data: "", filename: "" };
  //   }),
});
