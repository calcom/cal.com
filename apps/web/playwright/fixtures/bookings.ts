import type { Page } from "@playwright/test";
import type { Booking, Prisma } from "@prisma/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import short from "short-uuid";
import { v5 as uuidv5, v4 as uuidv4 } from "uuid";

import { prisma } from "@calcom/prisma";

dayjs.extend(utc);

const translator = short();

type BookingFixture = ReturnType<typeof createBookingFixture>;

// creates a user fixture instance and stores the collection
export const createBookingsFixture = (page: Page) => {
  let store = { bookings: [], page } as { bookings: BookingFixture[]; page: typeof page };
  return {
    create: async (
      userId: number,
      username: string | null,
      eventTypeId = -1,
      {
        confirmed = true,
        rescheduled = false,
        paid = false,
        status = "ACCEPTED",
      }: Partial<Prisma.BookingCreateInput> = {}
    ) => {
      const startDate = dayjs().add(1, "day").toDate();
      const seed = `${username}:${dayjs(startDate).utc().format()}:${new Date().getTime()}`;
      const uid = translator.fromUUID(uuidv5(seed, uuidv5.URL));
      const booking = await prisma.booking.create({
        data: {
          uid: uid,
          title: "30min",
          startTime: startDate,
          endTime: dayjs().add(1, "day").add(30, "minutes").toDate(),
          user: {
            connect: {
              id: userId,
            },
          },
          attendees: {
            create: {
              email: "attendee@example.com",
              name: "Attendee Example",
              timeZone: "Europe/London",
            },
          },
          eventType: {
            connect: {
              id: eventTypeId,
            },
          },
          confirmed,
          rescheduled,
          paid,
          status,
        },
      });
      const bookingFixture = createBookingFixture(booking, store.page!);
      store.bookings.push(bookingFixture);
      return bookingFixture;
    },
    get: () => store.bookings,
    delete: async (id: number) => {
      await prisma.booking.delete({
        where: { id },
      });
      store.bookings = store.bookings.filter((b) => b.id !== id);
    },
  };
};

// creates the single user fixture
const createBookingFixture = (booking: Booking, page: Page) => {
  const store = { booking, page };

  // self is a reflective method that return the Prisma object that references this fixture.
  return {
    id: store.booking.id,
    uid: store.booking.uid,
    self: async () => (await prisma.booking.findUnique({ where: { id: store.booking.id } }))!,
    delete: async () => (await prisma.booking.delete({ where: { id: store.booking.id } }))!,
  };
};
