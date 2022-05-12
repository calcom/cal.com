import type { Page } from "@playwright/test";
import type { Booking } from "@prisma/client";

import { prisma } from "@calcom/prisma";

type BookingFixture = ReturnType<typeof createBookingFixture>;

// creates a user fixture instance and stores the collection
export const createBookingsFixture = (page: Page) => {
  let store = { bookings: [], page } as { bookings: BookingFixture[]; page: typeof page };
  return {
    create: async () => {
      const booking = await prisma.booking.create({
        data: {
          endTime: "",
          startTime: "",
          title: "",
          uid: "",
        },
      });
      const bookingFixture = createBookingFixture(booking, store.page!);
      store.bookings.push(bookingFixture);
      return bookingFixture;
    },
    get: () => store.bookings,
    delete: async (id: number) => {
      const user = await prisma.booking.delete({
        where: { id },
      });
      store.bookings = store.bookings.filter((b) => b.id !== id);
    },
  };
};

type JSONValue = string | number | boolean | { [x: string]: JSONValue } | Array<JSONValue>;

// creates the single user fixture
const createBookingFixture = (booking: Booking, page: Page) => {
  const store = { booking, page };

  // self is a reflective method that return the Prisma object that references this fixture.
  return {
    id: booking.id,
    self: async () => (await prisma.booking.findUnique({ where: { id: store.booking.id } }))!,
    delete: async (id: number) => (await prisma.booking.delete({ where: { id } }))!,
  };
};
