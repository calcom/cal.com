import { Navbar } from "@/components/Navbar";
import { Inter } from "next/font/google";
// eslint-disable-next-line @calcom/eslint/deprecated-imports-next-router
import { useRouter } from "next/router";
import { useState } from "react";

import {
  Booker,
  useEventTypes,
  useTeamEventTypes,
  useTeams,
  useMe,
  useBookings,
  useBooking,
  useConnectedCalendars,
  useEventTypeById,
  useEvent,
} from "@calcom/atoms";

const inter = Inter({ subsets: ["latin"] });

export default function Bookings(props: { calUsername: string; calEmail: string }) {
  const [bookingTitle, setBookingTitle] = useState<string | null>(null);
  const [eventTypeSlug, setEventTypeSlug] = useState<string | null>(null);
  const [eventTypeDuration, setEventTypeDuration] = useState<number | null>(null);
  const [isTeamEvent, setIsTeamEvent] = useState<boolean>(false);
  const router = useRouter();
  const { isLoading: isLoadingEvents, data: eventTypes } = useEventTypes(props.calUsername);
  const { data: teams, isLoading: isLoadingTeams } = useTeams();
  const { isLoading: isLoadingTeamEvents, data: teamEventTypes } = useTeamEventTypes(teams?.[0]?.id || 0);
  const rescheduleUid = (router.query.rescheduleUid as string) ?? "";
  const eventTypeSlugQueryParam = (router.query.eventTypeSlug as string) ?? "";
  const { data: userData, isLoading: isLoadingUser } = useMe();
  const { isLoading: isLoadingBookingssssss, data: generalBookings } = useBookings({
    // status: ["upcoming"],
    // status: ["unconfirmed"],
  });
  const { isLoading: isLoadingBooking, data: bookingSpecific } = useBooking("nChHoxEm1GXVPzi7TNAuWc");
  const { isLoading: isLoadingConnectedCalendars, data: connectedCalendars } = useConnectedCalendars({});
  const { isLoading: isLoadingEventType, data: eventType } = useEventTypeById(1339);
  const { isLoading: isLoadingEvent, data: eventData } = useEvent(
    props.calUsername,
    "thirty-minutes-video",
    false
  );

  // useEventTypes returns all event types for a user, provided you pass in the correct username
  // useTeamEventTypes returns all event types for a team, provided you pass in the correct teamId
  // useTeams returns all teams info
  // useMe returns the current user's info
  // useBookings returns all bookings of a user or team
  // useBooking returns a specific booking provided you pass in the correct bookingUid

  // useCancelBooking returns a mutation function which can be used to cancel a booking
  // this function accepts an object with the following properties:
  // id, uid, cancellationReason, allRemainingBookings
  // out of all these id is mandatory

  // useConnectedCalendars is very imp for calendar details
  // useConnectedCalendars returns an object containing all connected calendars of a user and the destination calendar
  // it contains properties such as credentialId, externalId and integration which should be a string which can be used in the useAddSelectedCalendar, useRemoveSelectedCalendar hook
  //   {
  //     "credentialId": 15,
  //     "integration": "apple_calendar",
  //     "externalId": "https://caldav.icloud.com/20961146906/calendars/1644411A-1945-4248-BBC0-4F0F23B97A7E/"
  // }
  // above is example object that needs to be passed to add or remove selected calendars

  // useDeleteCalendarCredentials returns a mutation function which can be used to delete a calendar credentials
  // this function accepts an object with the following properties:
  // id here is the credential id , and calendar is the name of the calendar which can be either google, office365 or apple

  // useEventTypeById returns data for a specific event type, provided you pass in the correct event type id

  console.log(eventTypes, "event types from useEventTypes", "is loading", isLoadingEvents);
  console.log(teamEventTypes, "event types from teamEventTypes", "is loading", isLoadingTeamEvents);
  console.log(teams, "teams from useTeams", "is loading", isLoadingTeams);
  console.log(userData?.data, "teams from useMe", " isLoadingUser", isLoadingUser);
  console.log(generalBookings, "bookings from useBookings", "is loading bookings", isLoadingBookingssssss);
  console.log(bookingSpecific, "bookings from useBookingggg", "is loading bookinggg", isLoadingBooking);
  console.log(
    connectedCalendars,
    "connected calendars",
    "is loading connected calendars",
    isLoadingConnectedCalendars
  );

  console.log(eventType, "event type", "is loading event type", isLoadingEventType);
  console.log(eventData, "event type", "is LoadingEvent", isLoadingEvent);

  return (
    <main
      className={`flex min-h-screen flex-col ${inter.className} main text-default flex min-h-full w-full flex-col items-center overflow-visible`}>
      <Navbar username={props.calUsername} />
      <div>
        <h1 className="mx-10 my-4 text-2xl font-semibold">{props.calUsername} Public Booking Page</h1>

        {isLoadingEvents && !eventTypeSlug && <p>Loading...</p>}

        {!isLoadingEvents && !eventTypeSlug && Boolean(eventTypes?.length) && !rescheduleUid && (
          <div className="flex flex-col gap-4">
            <h1>User event types</h1>
            {eventTypes?.map(
              (event: { id: number; slug: string; title: string; lengthInMinutes: number }) => {
                const formatEventSlug = event.slug
                  .split("-")
                  .map((item) => `${item[0].toLocaleUpperCase()}${item.slice(1)}`)
                  .join(" ");

                return (
                  <div
                    onClick={() => {
                      setEventTypeSlug(event.slug);
                      setEventTypeDuration(event.lengthInMinutes);
                      setIsTeamEvent(false);
                    }}
                    className="mx-10 w-[80vw] cursor-pointer rounded-md border-[0.8px] border-black px-10 py-4"
                    key={event.id}>
                    <h1 className="text-lg font-semibold">{formatEventSlug}</h1>
                    <p>{`/${event.slug}`}</p>
                    <span className="border-none bg-gray-800 px-2 text-white">{event?.lengthInMinutes}</span>
                  </div>
                );
              }
            )}
          </div>
        )}

        {!isLoadingTeamEvents && !eventTypeSlug && Boolean(teamEventTypes?.length) && !rescheduleUid && (
          <div className="flex flex-col gap-4">
            <h1>Team event types</h1>
            {teamEventTypes?.map(
              (event: { id: number; slug: string; title: string; lengthInMinutes: number }) => {
                const formatEventSlug = event.slug
                  .split("-")
                  .map((item) => `${item[0].toLocaleUpperCase()}${item.slice(1)}`)
                  .join(" ");

                return (
                  <div
                    onClick={() => {
                      setEventTypeSlug(event.slug);
                      setEventTypeDuration(event.lengthInMinutes);
                      setIsTeamEvent(true);
                    }}
                    className="mx-10 w-[80vw] cursor-pointer rounded-md border-[0.8px] border-black px-10 py-4"
                    key={event.id}>
                    <h1 className="text-lg font-semibold">{formatEventSlug}</h1>
                    <p>{`/${event.slug}`}</p>
                    <span className="border-none bg-gray-800 px-2 text-white">{event?.lengthInMinutes}</span>
                  </div>
                );
              }
            )}
          </div>
        )}

        {!bookingTitle && eventTypeSlug && !rescheduleUid && (
          <>
            <Booker
              bannerUrl="https://i0.wp.com/mahala.co.uk/wp-content/uploads/2014/12/img_banner-thin_mountains.jpg?fit=800%2C258&ssl=1"
              eventSlug={eventTypeSlug}
              onCreateBookingSuccess={(data) => {
                setBookingTitle(data.data.title ?? "");
                if (data.data.paymentRequired) {
                  router.push(`/payment/${data.data.paymentUid}`);
                } else {
                  router.push(`/${data.data.uid}`);
                }
              }}
              metadata={{ CustomKey: "CustomValue" }}
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
              {...(isTeamEvent
                ? { isTeamEvent: true, teamId: teams?.[0]?.id || 0 }
                : { username: props.calUsername })}
              hostsLimit={3}
            />
          </>
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
            bannerUrl="https://i0.wp.com/mahala.co.uk/wp-content/uploads/2014/12/img_banner-thin_mountains.jpg?fit=800%2C258&ssl=1"
            hostsLimit={3}
          />
        )}
        {bookingTitle && <p>Booking created: {bookingTitle}</p>}
      </div>
    </main>
  );
}
