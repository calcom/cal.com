import { Navbar } from "@/components/Navbar";
import { Inter } from "next/font/google";
import { useState } from "react";

import { Booker, useEventTypesPublic } from "@calcom/atoms";

const inter = Inter({ subsets: ["latin"] });

export default function Bookings(props: { calUsername: string; calEmail: string }) {
  const [bookingTitle, setBookingTitle] = useState<string | null>(null);
  const [eventTypeSlug, setEventTypeSlug] = useState<string | null>(null);

  const { isLoading: isLoadingEvents, data: eventTypes } = useEventTypesPublic(props.calUsername);
  console.log(isLoadingEvents, eventTypes);
  return (
    <main
      className={`flex min-h-screen flex-col ${inter.className} main text-default flex min-h-full w-full flex-col items-center overflow-visible`}>
      <Navbar username={props.calUsername} />
      <div>
        <h1 className="my-4 text-2xl font-semibold">{props.calUsername} Public Booking Page</h1>

        {isLoadingEvents && !eventTypeSlug && <p>Loading...</p>}

        {!isLoadingEvents && !eventTypeSlug && Boolean(eventTypes?.length) && (
          <div className="flex flex-row gap-4">
            {eventTypes?.map((event: { id: number; slug: string; title: string }) => (
              <button
                key={event.id}
                className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
                onClick={() => setEventTypeSlug(event.slug)}>
                {event.slug}
              </button>
            ))}
          </div>
        )}

        {!bookingTitle && eventTypeSlug && (
          <Booker
            eventSlug="sixty-minutes-video"
            username={props.calUsername ?? ""}
            onCreateBookingSuccess={(data) => {
              setBookingTitle(data.data.title);
            }}
          />
        )}
        {bookingTitle && <p>Booking created: {bookingTitle}</p>}
      </div>
    </main>
  );
}
