"use client";

import { useParams } from "next/navigation";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { DecoyBookingSuccessCard } from "@calcom/features/bookings/Booker/components/DecoyBookingSuccessCard";
import { useDecoyBooking } from "@calcom/features/bookings/Booker/components/hooks/useDecoyBooking";

function parseBookingTime(time: string | Date | null | undefined): Dayjs | null {
  if (!time) return null;

  if (typeof time === "string" && time.endsWith("Z")) {
    return dayjs.utc(time);
  }

  return dayjs(time);
}

export default function BookingSuccessful() {
  const params = useParams();

  const uid = params?.uid as string;
  const bookingData = useDecoyBooking(uid);

  if (!bookingData) {
    return null;
  }

  const { booking } = bookingData;

  const startTime = parseBookingTime(booking.startTime);
  const endTime = parseBookingTime(booking.endTime);
  const timeZone = booking.booker?.timeZone || booking.host?.timeZone || dayjs.tz.guess();

  const formattedDate = startTime ? startTime.tz(timeZone).format("dddd, MMMM D, YYYY") : "";
  const formattedTime = startTime ? startTime.tz(timeZone).format("h:mm A") : "";
  const formattedEndTime = endTime ? endTime.tz(timeZone).format("h:mm A") : "";
  const formattedTimeZone = timeZone;

  const hostName = booking.host?.name || null;
  const hostEmail = null; // Email not stored for spam decoy bookings
  const attendeeName = booking.booker?.name || null;
  const attendeeEmail = booking.booker?.email || null;

  return (
    <DecoyBookingSuccessCard
      title={booking.title || "Booking"}
      formattedDate={formattedDate}
      formattedTime={formattedTime}
      endTime={formattedEndTime}
      formattedTimeZone={formattedTimeZone}
      hostName={hostName}
      hostEmail={hostEmail}
      attendeeName={attendeeName}
      attendeeEmail={attendeeEmail}
      location={booking.location || null}
    />
  );
}
