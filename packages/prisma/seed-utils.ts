import type { Prisma, UserPermissionRole } from "@prisma/client";
import { uuid } from "short-uuid";

import dayjs from "@calcom/dayjs";
import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";

import prisma from ".";

export async function createUserAndEventType({
  user,
  eventTypes = [],
}: {
  user: {
    email: string;
    password: string;
    username: string;
    name: string;
    completedOnboarding?: boolean;
    timeZone?: string;
    role?: UserPermissionRole;
    theme?: "dark" | "light";
  };
  eventTypes?: Array<
    Prisma.EventTypeUncheckedCreateInput & {
      _bookings?: Prisma.BookingCreateInput[];
      _numBookings?: number;
    }
  >;
}) {
  const userData = {
    ...user,
    password: await hashPassword(user.password),
    emailVerified: new Date(),
    completedOnboarding: user.completedOnboarding ?? true,
    locale: "en",
    schedules:
      user.completedOnboarding ?? true
        ? {
            create: {
              name: "Working Hours",
              availability: {
                createMany: {
                  data: getAvailabilityFromSchedule(DEFAULT_SCHEDULE),
                },
              },
            },
          }
        : undefined,
  };

  const theUser = await prisma.user.upsert({
    where: { email_username: { email: user.email, username: user.username } },
    update: userData,
    create: userData,
  });

  console.log(
    `👤 Upserted '${user.username}' with email "${user.email}" & password "${user.password}". Booking page 👉 ${process.env.NEXT_PUBLIC_WEBAPP_URL}/${user.username}`
  );

  for (const eventTypeInput of eventTypes) {
    const { _bookings, _numBookings, ...eventTypeData } = eventTypeInput;
    let bookingFields;
    if (_bookings && _numBookings) {
      throw new Error("You can't set both _bookings and _numBookings");
    } else if (_numBookings) {
      bookingFields = [...Array(_numBookings).keys()].map((i) => ({
        startTime: dayjs()
          .add(1, "day")
          .add(i * 5 + 0, "minutes")
          .toDate(),
        endTime: dayjs()
          .add(1, "day")
          .add(i * 5 + 30, "minutes")
          .toDate(),
        title: `${eventTypeInput.title}:${i + 1}`,
        uid: uuid(),
      }));
    } else {
      bookingFields = _bookings || [];
    }
    eventTypeData.userId = theUser.id;
    eventTypeData.users = { connect: { id: theUser.id } };

    const eventType = await prisma.eventType.findFirst({
      where: {
        slug: eventTypeData.slug,
        users: {
          some: {
            id: eventTypeData.userId,
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (eventType) {
      console.log(
        `\t📆 Event type ${eventTypeData.slug} already seems seeded - ${process.env.NEXT_PUBLIC_WEBAPP_URL}/${user.username}/${eventTypeData.slug}`
      );
      continue;
    }
    const { id } = await prisma.eventType.create({
      data: eventTypeData,
    });

    console.log(
      `\t📆 Event type ${eventTypeData.slug} with id ${id}, length ${eventTypeData.length}min - ${process.env.NEXT_PUBLIC_WEBAPP_URL}/${user.username}/${eventTypeData.slug}`
    );

    for (const bookingInput of bookingFields) {
      await prisma.booking.create({
        data: {
          ...bookingInput,
          user: {
            connect: {
              email: user.email,
            },
          },
          attendees: {
            create: {
              email: user.email,
              name: user.name,
              timeZone: "Europe/London",
            },
          },
          eventType: {
            connect: {
              id,
            },
          },
          status: bookingInput.status,
          iCalUID: "",
        },
      });
      console.log(
        `\t\t☎️ Created booking ${bookingInput.title} at ${new Date(
          bookingInput.startTime
        ).toLocaleDateString()}`
      );
    }
  }
  console.log("👤 User with it's event-types and bookings created", theUser.email);
  return theUser;
}
