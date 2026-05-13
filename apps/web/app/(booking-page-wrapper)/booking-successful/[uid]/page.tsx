"use client";

import { useParams } from "next/navigation";

import dayjs from "@calcom/dayjs";
import { ChristmasEasterEgg } from "~/bookings/components/ChristmasEasterEgg";
import { DecoyBookingSuccessCard } from "~/bookings/components/DecoyBookingSuccessCard";
import { useDecoyBooking } from "~/bookings/hooks/useDecoyBooking";

export default function BookingSuccessful() {
  const params = useParams();

  const uid = params?.uid as string;
  const bookingData = useDecoyBooking(uid);

  if (!bookingData) {
    return null;
  }

  const { booking } = bookingData;

  // Format the data for the BookingSuccessCard
  const startTime = booking.startTime ? dayjs(booking.startTime) : null;
  const endTime = booking.endTime ? dayjs(booking.endTime) : null;
  const timeZone = booking.booker?.timeZone || booking.host?.timeZone || dayjs.tz.guess();

  // dayjs month() is 0-indexed, so December = 11
  const isChristmas = startTime ? startTime.month() === 11 && startTime.date() === 25 : false;

  const formattedDate = startTime ? startTime.tz(timeZone).format("dddd, MMMM D, YYYY") : "";
  const formattedTime = startTime ? startTime.tz(timeZone).format("h:mm A") : "";
  const formattedEndTime = endTime ? endTime.tz(timeZone).format("h:mm A") : "";
  const formattedTimeZone = timeZone;

  const hostName = booking.host?.name || null;
  const hostEmail = null; // Email not stored for spam decoy bookings
  const attendeeName = booking.booker?.name || null;
  const attendeeEmail = booking.booker?.email || null;

  return (
    <>
      {isChristmas && <ChristmasEasterEgg />}
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
    </>
  );
}
