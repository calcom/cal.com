import { Booking } from "@prisma/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import short from "short-uuid";
import { v5 as uuidv5, v4 as uuidv4 } from "uuid";

dayjs.extend(utc);

const translator = short();

const TestUtilCreateBookingOnUserId = async (
  userId: number,
  username: string,
  eventTypeId: number,
  { confirmed = true, rescheduled = false, paid = false, status = "ACCEPTED" }: Partial<Booking>
) => {
  const startDate = dayjs().add(1, "day").toDate();
  const seed = `${username}:${dayjs(startDate).utc().format()}:${new Date().getTime()}`;
  const uid = translator.fromUUID(uuidv5(seed, uuidv5.URL));
  return await prisma?.booking.create({
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
    select: {
      id: true,
      uid: true,
      user: true,
    },
  });
};

const TestUtilCreatePayment = async (
  bookingId: number,
  { success = false, refunded = false }: { success?: boolean; refunded?: boolean }
) => {
  return await prisma?.payment.create({
    data: {
      uid: uuidv4(),
      amount: 20000,
      fee: 160,
      currency: "usd",
      success,
      refunded,
      type: "STRIPE",
      data: {},
      externalId: "DEMO_PAYMENT_FROM_DB",
      booking: {
        connect: {
          id: bookingId,
        },
      },
    },
  });
};

export { TestUtilCreateBookingOnUserId, TestUtilCreatePayment };
