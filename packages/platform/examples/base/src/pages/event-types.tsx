import { Navbar } from "@/components/Navbar";
import { Inter } from "next/font/google";
// eslint-disable-next-line @calcom/eslint/deprecated-imports-next-router
import { useRouter } from "next/router";
import { useState } from "react";

import {
  useEventTypes,
  useTeamEventTypes,
  useTeams,
  EventTypeSettings,
  CreateEventType,
} from "@calcom/atoms";

const inter = Inter({ subsets: ["latin"] });

export default function Bookings(props: { calUsername: string; calEmail: string }) {
  const [eventTypeId, setEventTypeId] = useState<number | null>(null);
  const [isTeamEvent, setIsTeamEvent] = useState<boolean>(false);
  const router = useRouter();
  const { isLoading: isLoadingEvents, data: eventTypes, refetch } = useEventTypes(props.calUsername);
  const { data: teams } = useTeams();
  const {
    isLoading: isLoadingTeamEvents,
    data: teamEventTypes,
    refetch: refetchTeamEvents,
  } = useTeamEventTypes(teams?.[0]?.id || 0);
  const rescheduleUid = (router.query.rescheduleUid as string) ?? "";

  return (
    <main
      className={`flex min-h-screen flex-col ${inter.className} main text-default flex min-h-full w-full flex-col items-center overflow-visible`}>
      <Navbar username={props.calUsername} />
      <div>
        <h1 className="mx-10 my-4 text-2xl font-semibold">
          EventTypes{eventTypeId ? `: ${eventTypeId}` : ""}
        </h1>

        {isLoadingEvents && !eventTypeId && <p>Loading...</p>}

        {!isLoadingEvents && !eventTypeId && Boolean(eventTypes?.length) && !rescheduleUid && (
          <div className="flex flex-col gap-4">
            {eventTypes?.map(
              (event: { id: number; slug: string; title: string; lengthInMinutes: number }) => {
                const formatEventSlug = event.slug
                  .split("-")
                  .map((item) => `${item[0].toLocaleUpperCase()}${item.slice(1)}`)
                  .join(" ");

                return (
                  <div
                    onClick={() => {
                      setEventTypeId(event.id);
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

        {!isLoadingTeamEvents && !eventTypeId && Boolean(teamEventTypes?.length) && !rescheduleUid && (
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
                      setEventTypeId(event.id);
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
        {eventTypeId && (
          <div>
            <EventTypeSettings
              customClassNames={{
                atomsWrapper: "!w-[50vw] !m-auto",
                eventAvailabilityTab: {
                  teamAvailability: {
                    chooseHostSchedulesLabelContainer: "border border-purple-200 bg-purple-50 rounded-md p-4",
                    chooseHostSchedulesLabel: "text-purple-700 font-semibold",
                    chooseHostSchedulesLabelDescription: "text-gray-600",
                    teamAvailibilityContainer: "mt-4 border border-purple-200 bg-white rounded-lg p-6",
                    teamMemberSchedule: {
                      labelAvatar: "rounded-full border border-purple-300",
                      labelContainer: "flex items-center gap-2",
                      innerClassNames: {
                        input: "text-purple-900",
                        option: "hover:bg-purple-100",
                        control: "border-purple-300",
                        singleValue: "text-purple-700",
                        valueContainer: "",
                        multiValue: "",
                        menu: "border border-purple-200 rounded-md",
                        menuList: "",
                      },
                      select: "border border-purple-300 rounded-md bg-white",
                      label: "text-purple-700",
                      container: "",
                    },
                  },
                  userAvailability: {
                    availabilitySectionContainer: "border border-purple-200 bg-white rounded-lg p-6",
                    availabilitySelect: {
                      innerClassNames: {
                        input: "text-purple-900",
                        option: "hover:bg-purple-100",
                        control: "border-purple-300",
                        singleValue: "text-purple-700",
                        valueContainer: "",
                        multiValue: "",
                        menu: "border border-purple-200 rounded-md",
                        menuList: "",
                      },
                      select: "border border-purple-300 rounded-md bg-white",
                      label: "text-purple-700",
                      container: "",
                    },
                    availabilityTable: {
                      tableContainer: "border border-purple-200 rounded-md bg-white mt-4",
                      table: "w-full table-auto",
                      tableRow: "hover:bg-purple-50",
                      day: "text-purple-800 font-semibold",
                      dayUnavailable: "text-gray-400",
                      dayAvailabilityContainer: "flex items-center gap-2",
                      dayAvailabilityFrom: "text-purple-700",
                      dayAvailabilityTo: "text-purple-700",
                      dayAvailabilitySeperator: "text-purple-500",
                    },
                  },
                },
                eventRecurringTab: {
                  container: "border border-purple-200 bg-purple-50 rounded-lg shadow-sm",
                  recurringToggle: {
                    container: "border border-purple-200 bg-purple-100 rounded-lg",
                    label: "text-purple-700",
                    description: "text-purple-500",
                    children: "bg-purple-50 rounded-md",
                  },
                  frequencyInput: {
                    container: "border border-purple-200 bg-purple-100 rounded-lg",
                    label: "text-purple-700",
                    input: "border border-purple-300 rounded-md text-purple-900 bg-white",
                    addOn: "text-purple-500",
                  },
                  frequencyUnitSelect: {
                    select: "border border-purple-300 rounded-md text-purple-900 bg-purple-50",
                    label: "text-purple-700",
                    container: "mb-4",
                    innerClassNames: {
                      input: "text-purple-900",
                      option: "text-purple-700 hover:bg-purple-200",
                      control: "border-purple-300",
                      singleValue: "text-purple-900",
                      valueContainer: "bg-purple-100",
                      multiValue: "bg-purple-200 rounded-md text-purple-900",
                      menu: "border border-purple-200 rounded-md",
                      menuList: "",
                    },
                  },
                  maxEventsInput: {
                    countInput: "border border-purple-300 rounded-md text-purple-900 bg-white",
                    labelText: "text-purple-700",
                    suffixText: "text-purple-500",
                    container: "border border-purple-200 bg-purple-100 rounded-lg",
                  },
                  experimentalAlert: "border border-red-300 bg-red-50 rounded-lg text-red-900 shadow-sm",
                  paymentAlert: "border border-purple-300 bg-purple-100 rounded-lg text-purple-900 shadow-md",
                },
              }}
              allowDelete={true}
              id={eventTypeId}
              tabs={["setup", "limits", "recurring", "advanced", "availability", "team", "payments"]}
              onSuccess={(eventType) => {
                setEventTypeId(null);
                refetch();
              }}
              onError={(eventType, error) => {
                console.log(eventType);
                console.error(error);
              }}
              onDeleteSuccess={() => {
                refetch();
                refetchTeamEvents();
                setEventTypeId(null);
              }}
              onDeleteError={console.error}
            />
          </div>
        )}

        {!eventTypeId && (
          <div className="mt-8 flex flex-row items-center justify-center gap-24">
            <div className="flex w-[30vw] flex-col gap-2">
              <h1 className="font-semibold">Create Event Type</h1>
              <CreateEventType
                customClassNames={{
                  atomsWrapper: "border p-4 shadow-md rounded-md",
                  buttons: { container: "justify-center", submit: "bg-red-500", cancel: "bg-gray-300" },
                }}
                onSuccess={() => {
                  refetch();
                }}
              />
            </div>

            <div className="flex w-[30vw] flex-col gap-2">
              <h1 className="font-semibold">Create Team Event Type</h1>
              {teams?.[0]?.id && (
                <CreateEventType
                  customClassNames={{
                    atomsWrapper: "border shadow-md p-4 rounded-md ",
                    buttons: {
                      container: "justify-center flex-row-reverse",
                      submit: "bg-green-500",
                      cancel: "bg-stone-300",
                    },
                  }}
                  teamId={teams?.[0]?.id}
                  onCancel={() => {
                    console.log("cancel team event type creation");
                  }}
                  onSuccess={() => {
                    refetchTeamEvents();
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
