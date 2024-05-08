import { Navbar } from "@/components/Navbar";
import { Inter } from "next/font/google";
// eslint-disable-next-line @calcom/eslint/deprecated-imports-next-router
import { useRouter } from "next/router";
import { useState } from "react";

import { Booker, useEventTypesPublic } from "@calcom/atoms";

const inter = Inter({ subsets: ["latin"] });

export default function Bookings(props: { calUsername: string; calEmail: string }) {
  const [bookingTitle, setBookingTitle] = useState<string | null>(null);
  const [eventTypeSlug, setEventTypeSlug] = useState<string | null>(null);
  const [eventTypeDuration, setEventTypeDuration] = useState<number | null>(null);
  const router = useRouter();
  const { isLoading: isLoadingEvents, data: eventTypes } = useEventTypesPublic(props.calUsername);
  const rescheduleUid = (router.query.rescheduleUid as string) ?? "";
  const eventTypeSlugQueryParam = (router.query.eventTypeSlug as string) ?? "";

  return (
    <main
      className={`flex min-h-screen flex-col ${inter.className} main text-default flex min-h-full w-full flex-col items-center overflow-visible`}>
      <Navbar username={props.calUsername} />
      <div>
        <h1 className="mx-10 my-4 text-2xl font-semibold">{props.calUsername} Public Booking Page</h1>

        {isLoadingEvents && !eventTypeSlug && <p>Loading...</p>}

        {!isLoadingEvents && !eventTypeSlug && Boolean(eventTypes?.length) && !rescheduleUid && (
          <div className="flex flex-col gap-4">
            {eventTypes?.map((event: { id: number; slug: string; title: string; length: number }) => {
              const formatEventSlug = event.slug
                .split("-")
                .map((item) => `${item[0].toLocaleUpperCase()}${item.slice(1)}`)
                .join(" ");

              return (
                <div
                  onClick={() => {
                    setEventTypeSlug(event.slug);
                    setEventTypeDuration(event.length);
                  }}
                  className="mx-10 w-[80vw] cursor-pointer rounded-md border-[0.8px] border-black px-10 py-4"
                  key={event.id}>
                  <h1 className="text-lg font-semibold">{formatEventSlug}</h1>
                  <p>{`/${event.slug}`}</p>
                  <span className="border-none bg-gray-800 px-2 text-white">{event?.length}</span>
                </div>
              );
            })}
          </div>
        )}

        {!bookingTitle && eventTypeSlug && !rescheduleUid && (
          <Booker
            eventSlug={eventTypeSlug}
            username={props.calUsername ?? ""}
            onCreateBookingSuccess={(data) => {
              setBookingTitle(data.data.title ?? "");
              router.push(`/${data.data.uid}`);
            }}
            duration={eventTypeDuration}
            customClassNames={{
              bookerContainer: "!bg-[#F5F2FE] [&_button:!rounded-full] border-subtle border",
              datePickerCustomClassNames: {
                datePickerDatesActive: "!bg-[#D7CEF5]",
              },
              eventMetaCustomClassNames: {
                eventMetaTitle: "text-[#7151DC]",
              },
              availableTimeSlotsCustomClassNames: {
                availableTimeSlotsHeaderContainer: "!bg-[#F5F2FE]",
                availableTimes: "!bg-[#D7CEF5]",
              },
            }}
          />
        )}
        {!bookingTitle && rescheduleUid && eventTypeSlugQueryParam && (
          <Booker
            rescheduleUid={rescheduleUid}
            eventSlug={eventTypeSlugQueryParam}
            username={props.calUsername ?? ""}
            onCreateBookingSuccess={(data) => {
              setBookingTitle(data.data.title ?? "");
              router.push(`/${data.data.uid}`);
            }}
            duration={eventTypeDuration}
            entity={{
              orgSlug: "ecorp",
              considerUnpublished: false,
            }}
          />
        )}
        {bookingTitle && <p>Booking created: {bookingTitle}</p>}
      </div>
    </main>
  );
}
