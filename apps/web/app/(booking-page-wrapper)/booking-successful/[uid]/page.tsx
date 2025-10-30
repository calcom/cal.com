"use client";

import { useParams } from "next/navigation";

import dayjs from "@calcom/dayjs";
import { DecoyBookingSuccessCard } from "@calcom/features/bookings/Booker/components/DecoyBookingSuccessCard";
import { useDecoyBooking } from "@calcom/features/bookings/Booker/components/hooks/useDecoyBooking";

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
