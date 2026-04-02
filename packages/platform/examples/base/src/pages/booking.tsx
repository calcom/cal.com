import { Booker, useEventTypes, useTeamEventTypes, useTeams } from "@calcom/atoms";
import { Inter } from "next/font/google";
import { useRouter } from "next/router";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export default function Bookings(props: { calUsername: string; calEmail: string }) {
  const [bookingTitle, setBookingTitle] = useState<string | null>(null);
  const [eventTypeSlug, setEventTypeSlug] = useState<string | null>(null);
  const [eventTypeDuration, setEventTypeDuration] = useState<number | null>(null);
  const [isTeamEvent, setIsTeamEvent] = useState<boolean>(false);
  const router = useRouter();
  const { isLoading: isLoadingEvents, data: eventTypes } = useEventTypes(props.calUsername);
  const { data: teams } = useTeams();
  const { isLoading: isLoadingTeamEvents, data: teamEventTypes } = useTeamEventTypes(teams?.[0]?.id || 0);
  const rescheduleUid = (router.query.rescheduleUid as string) ?? "";
  const rescheduledBy = (router.query.rescheduledBy as string) ?? "";
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
            <h1>User event types</h1>
            {eventTypes?.map(
              (event: { id: number; slug: string; title: string; lengthInMinutes: number }) => {
                const formatEventSlug = event.slug
                  .split("-")
                  .map((item) => `${item[0].toLocaleUpperCase()}${item.slice(1)}`)
                  .join(" ");

                return (
                  <div
                    data-testid="event-type-card"
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
              // timeZones={["Europe/London", "Asia/Kolkata"]}
              // isBookingDryRun={true}
              // roundRobinHideOrgAndTeam={true}
              defaultFormValues={{ name: "Bob the booker", email: "bob@thebooker.com" }}
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
              onBookerStateChange={(bookerState) => {
                console.log("Booker state updated:", bookerState);
                // You can perform any actions based on the updated state here
              }}
              metadata={{ CustomKey: "CustomValue" }}
              duration={eventTypeDuration}
              confirmButtonDisabled={false}
              customClassNames={{
                bookerContainer: "bg-[#F5F2FE]! [&_button:!rounded-full] border-subtle border",
                datePickerCustomClassNames: {
                  datePickerDatesActive: "bg-[#D7CEF5]!",
                },
                eventMetaCustomClassNames: {
                  eventMetaTitle: "text-[#7151DC]",
                },
                availableTimeSlotsCustomClassNames: {
                  availableTimeSlotsHeaderContainer: "bg-[#F5F2FE]!",
                  availableTimes: "bg-[#D7CEF5]!",
                },
                confirmStep: {
                  confirmButton: "bg-purple-700!",
                  backButton: "text-purple-700 hover:bg-purple-700! hover:text-white!",
                },
              }}
              {...(isTeamEvent
                ? {
                    isTeamEvent: true,
                    teamId: teams?.[0]?.id || 0,
                  }
                : { username: props.calUsername })}
              hostsLimit={3}
              allowUpdatingUrlParams={true}
              silentlyHandleCalendarFailures={false}
              // hideEventMetadata={true}
            />
          </>
        )}
        {!bookingTitle && rescheduleUid && eventTypeSlugQueryParam && (
          <Booker
            rescheduleUid={rescheduleUid}
            rescheduledBy={rescheduledBy}
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
