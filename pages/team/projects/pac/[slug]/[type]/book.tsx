import dayjs, { Dayjs } from "dayjs";
import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import React, { useMemo, useState } from "react";

import { asStringOrNull, asStringOrThrow } from "@lib/asStringOrNull";
import { getWorkingHours } from "@lib/availability";
import prisma from "@lib/prisma";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@lib/telemetry";

import SelfSchedulingHeader from "@components/autoscheduling/Header";
import AvailableTimesNoReroute from "@components/booking/AvailableTimesNoReroute";
import DatePicker from "@components/booking/DatePicker";
import Button from "@components/ui/Button";

import { AvailabilityPageProps } from "../../../../../[user]/[type]";

export default function BookPage({ profile, eventType, workingHours }: AvailabilityPageProps) {
  const router = useRouter();
  const telemetry = useTelemetry();
  const [timeFormat, setTimeFormat] = useState("h:mma"); // eslint-disable-line
  const [selectedTime, setSelectedTime] = useState<string>(); // eslint-disable-line

  const handleSubmit = () => {
    router.push({
      pathname: "review",
      query: { ...router.query, time: selectedTime, eventId: eventType.id },
    });
  };

  const handleBack = () => {
    router.push({ pathname: "/team/projects/pac/site", query: { service: router.query.service } });
  };

  const selectedDate = useMemo(() => {
    const dateString = asStringOrNull(router.query.date);
    if (dateString) {
      // todo some extra validation maybe.
      const utcOffsetAsDate = dayjs(dateString.substr(11, 14), "Hmm");
      const utcOffset = parseInt(
        dateString.substr(10, 1) + (utcOffsetAsDate.hour() * 60 + utcOffsetAsDate.minute())
      );
      const date = dayjs(dateString.substr(0, 10)).utcOffset(utcOffset, true);
      return date.isValid() ? date : null;
    }
    return null;
  }, [router.query.date]);

  const changeDate = (newDate: Dayjs) => {
    telemetry.withJitsu((jitsu) => jitsu.track(telemetryEventTypes.dateSelected, collectPageParameters()));
    router.replace(
      {
        query: {
          ...router.query,
          date: newDate.format("YYYY-MM-DDZZ"),
        },
      },
      undefined,
      {
        shallow: true,
      }
    );
  };

  return (
    <div className="bg-gray-200 h-screen flex flex-col justify-between">
      <div className="p-4 bg-white overflow-hidden">
        <SelfSchedulingHeader page="book" />
        <div className="h-[95%] overflow-auto mt-4">
          <DatePicker
            noMargin
            date={selectedDate}
            periodType={eventType?.periodType}
            periodStartDate={eventType?.periodStartDate}
            periodEndDate={eventType?.periodEndDate}
            periodDays={eventType?.periodDays}
            periodCountCalendarDays={eventType?.periodCountCalendarDays}
            onDatePicked={changeDate}
            workingHours={workingHours}
            weekStart={profile.weekStart || "Sunday"}
            eventLength={eventType.length}
            minimumBookingNotice={eventType.minimumBookingNotice}
          />
          {selectedDate && (
            <AvailableTimesNoReroute
              timeFormat={timeFormat}
              minimumBookingNotice={eventType.minimumBookingNotice}
              eventTypeId={eventType.id}
              eventLength={eventType.length}
              date={selectedDate}
              users={eventType.users}
              schedulingType="ROUND_ROBIN"
              onSelect={(selectedTime) => setSelectedTime(selectedTime)}
            />
          )}
        </div>
      </div>
      <div className="min-h-24 bg-white py-2 px-4 drop-shadow-[0_-4px_8px_rgba(0,0,0,0.08)]">
        <div className="flex flex-row w-full">
          <Button color="secondary" className="w-full justify-center" onClick={handleBack}>
            Anterior
          </Button>
          <Button className="w-full ml-4 justify-center" disabled={!selectedTime} onClick={handleSubmit}>
            Próximo
          </Button>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const slugParam = asStringOrNull(context.query.slug);
  const typeParam = asStringOrNull(context.query.type);

  const team = await prisma.team.findFirst({
    where: {
      slug: slugParam,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      eventTypes: {
        where: {
          slug: typeParam || undefined,
        },
        select: {
          id: true,
          users: {
            select: {
              id: true,
              name: true,
              avatar: true,
              username: true,
              timeZone: true,
              hideBranding: true,
              plan: true,
              brandColor: true,
            },
          },
          title: true,
          availability: true,
          description: true,
          length: true,
          schedulingType: true,
          periodType: true,
          periodStartDate: true,
          periodEndDate: true,
          periodDays: true,
          periodCountCalendarDays: true,
          minimumBookingNotice: true,
          price: true,
          currency: true,
          timeZone: true,
        },
      },
    },
  });

  if (!team || team.eventTypes.length != 1) {
    return {
      notFound: true,
    };
  }

  const [eventType] = team.eventTypes;

  const workingHours = getWorkingHours(
    {
      timeZone: eventType.timeZone || undefined,
    },
    eventType.availability
  );

  // const eventTypeId = parseInt(asStringOrThrow(context.query.type));
  // if (typeof eventTypeId !== "number" || eventTypeId % 1 !== 0) {
  //   return {
  //     notFound: true,
  //   } as const;
  // }

  const fetchedEventType = await prisma.eventType.findUnique({
    where: {
      id: eventType.id,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      length: true,
      locations: true,
      customInputs: true,
      periodType: true,
      periodDays: true,
      periodStartDate: true,
      periodEndDate: true,
      periodCountCalendarDays: true,
      disableGuests: true,
      team: {
        select: {
          slug: true,
          name: true,
          logo: true,
        },
      },
      users: {
        select: {
          username: true,
        },
      },
    },
  });

  if (!fetchedEventType) return { notFound: true };

  const eventTypeObject = [fetchedEventType].map((e) => {
    return {
      ...e,
      periodStartDate: e.periodStartDate?.toString() ?? null,
      periodEndDate: e.periodEndDate?.toString() ?? null,
    };
  })[0];

  let booking = null;

  if (context.query.rescheduleUid) {
    booking = await prisma.booking.findFirst({
      where: {
        uid: asStringOrThrow(context.query.rescheduleUid),
      },
      select: {
        description: true,
        attendees: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });
  }

  return {
    props: {
      profile: {
        ...eventTypeObject.team,
        slug: "team/projects/pac" + eventTypeObject.slug,
        image: eventTypeObject.team?.logo || null,
        theme: null /* Teams don't have a theme, and `BookingPage` uses it */,
      },
      eventType: eventTypeObject,
      booking,
      workingHours,
    },
  };
}
