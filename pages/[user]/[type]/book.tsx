import { Prisma } from "@prisma/client";
import dayjs, { Dayjs } from "dayjs";
import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import React, { useMemo, useState } from "react";

import { asStringOrNull } from "@lib/asStringOrNull";
import { getWorkingHours } from "@lib/availability";
import prisma from "@lib/prisma";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@lib/telemetry";

import AutoSchedulingHeader from "@components/autoscheduling/Header";
import AvailableTimesNoReroute from "@components/booking/AvailableTimesNoReroute";
import DatePicker from "@components/booking/DatePicker";
import Button from "@components/ui/Button";

import { ssrInit } from "@server/lib/ssr";

import { AvailabilityPageProps } from "../[type]";

export default function BookPage({ profile, eventType, workingHours }: AvailabilityPageProps) {
  const router = useRouter();
  const telemetry = useTelemetry();
  const [timeFormat, setTimeFormat] = useState("h:mma"); // eslint-disable-line
  const [selectedTime, setSelectedTime] = useState<string>(); // eslint-disable-line

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
        <AutoSchedulingHeader />
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
              schedulingType={eventType.schedulingType ?? null}
              onSelect={(selectedTime) => setSelectedTime(selectedTime)}
            />
          )}
        </div>
      </div>
      <div className="min-h-24 bg-white py-2 px-4 drop-shadow-[0_-4px_8px_rgba(0,0,0,0.08)]">
        <div className="flex flex-row w-full">
          <Button color="secondary" className="w-full justify-center">
            Anterior
          </Button>
          <Button className="w-full ml-4 justify-center">Próximo</Button>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);
  // get query params and typecast them to string
  // (would be even better to assert them instead of typecasting)
  const userParam = asStringOrNull(context.query.user);
  const typeParam = asStringOrNull(context.query.type);
  const dateParam = asStringOrNull(context.query.date);

  if (!userParam || !typeParam) {
    throw new Error(`File is not named [type]/[user]`);
  }

  const eventTypeSelect = Prisma.validator<Prisma.EventTypeSelect>()({
    id: true,
    title: true,
    availability: true,
    description: true,
    length: true,
    price: true,
    currency: true,
    periodType: true,
    periodStartDate: true,
    periodEndDate: true,
    periodDays: true,
    periodCountCalendarDays: true,
    schedulingType: true,
    minimumBookingNotice: true,
    timeZone: true,
    users: {
      select: {
        avatar: true,
        name: true,
        username: true,
        hideBranding: true,
        plan: true,
        timeZone: true,
      },
    },
  });

  const user = await prisma.user.findUnique({
    where: {
      username: userParam.toLowerCase(),
    },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      bio: true,
      avatar: true,
      startTime: true,
      endTime: true,
      timeZone: true,
      weekStart: true,
      availability: true,
      hideBranding: true,
      brandColor: true,
      theme: true,
      plan: true,
      eventTypes: {
        where: {
          AND: [
            {
              slug: typeParam,
            },
            {
              teamId: null,
            },
          ],
        },
        select: eventTypeSelect,
      },
    },
  });

  if (!user) {
    return {
      notFound: true,
    };
  }

  if (user.eventTypes.length !== 1) {
    const eventTypeBackwardsCompat = await prisma.eventType.findFirst({
      where: {
        AND: [
          {
            userId: user.id,
          },
          {
            slug: typeParam,
          },
        ],
      },
      select: eventTypeSelect,
    });
    if (!eventTypeBackwardsCompat) {
      return {
        notFound: true,
      };
    }
    eventTypeBackwardsCompat.users.push({
      avatar: user.avatar,
      name: user.name,
      username: user.username,
      hideBranding: user.hideBranding,
      plan: user.plan,
      timeZone: user.timeZone,
    });
    user.eventTypes.push(eventTypeBackwardsCompat);
  }

  const [eventType] = user.eventTypes;

  // check this is the first event

  // TEMPORARILY disabled because of a bug during event create - during which users were able
  // to create event types >n1.
  /*if (user.plan === "FREE") {
    const firstEventType = await prisma.eventType.findFirst({
      where: {
        OR: [
          {
            userId: user.id,
          },
          {
            users: {
              some: {
                id: user.id,
              },
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });
    if (firstEventType?.id !== eventType.id) {
      return {
        notFound: true,
      } as const;
    }
  }*/

  const eventTypeObject = Object.assign({}, eventType, {
    periodStartDate: eventType.periodStartDate?.toString() ?? null,
    periodEndDate: eventType.periodEndDate?.toString() ?? null,
  });

  const workingHours = getWorkingHours(
    {
      timeZone: eventType.timeZone || user.timeZone,
    },
    eventType.availability.length ? eventType.availability : user.availability
  );

  eventTypeObject.availability = [];

  return {
    props: {
      profile: {
        name: user.name,
        image: user.avatar,
        slug: user.username,
        theme: user.theme,
        weekStart: user.weekStart,
        brandColor: user.brandColor,
      },
      date: dateParam,
      eventType: eventTypeObject,
      workingHours,
      trpcState: ssr.dehydrate(),
    },
  };
};
