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
                eventLimitsTab: {
                  bufferAndNoticeSection: {
                    container: "border border-purple-200 bg-purple-100 rounded-lg",
                    beforeBufferSelect: {
                      container: "mb-4",
                      label: "text-purple-700",
                      select: "border border-purple-300 rounded-md text-purple-900 bg-white",
                      innerClassNames: {
                        input: "text-purple-900",
                        option: "text-purple-700 hover:bg-purple-200",
                        control: "border-purple-300",
                        singleValue: "text-purple-900",
                        valueContainer: "bg-purple-100",
                        menu: "border border-purple-200 rounded-md",
                        menuList: "bg-white",
                      },
                    },
                    afterBufferSelect: {
                      container: "mb-4",
                      label: "text-purple-700",
                      select: "border border-purple-300 rounded-md text-purple-900 bg-white",
                      innerClassNames: {
                        input: "text-purple-900",
                        option: "text-purple-700 hover:bg-purple-200",
                        control: "border-purple-300",
                        singleValue: "text-purple-900",
                        valueContainer: "bg-purple-100",
                        menu: "border border-purple-200 rounded-md",
                        menuList: "bg-white",
                      },
                    },
                    minimumNoticeInput: {
                      container: "mb-4",
                      label: "text-purple-700",
                      input: "border border-purple-300 rounded-md text-purple-900 bg-white",
                      select: "border border-purple-300 rounded-md text-purple-900 bg-purple-50",
                      innerClassNames: {
                        input: "text-purple-900",
                        option: "text-purple-700 hover:bg-purple-200",
                        control: "border-purple-300",
                        singleValue: "text-purple-900",
                        valueContainer: "bg-purple-100",
                      },
                    },
                    timeSlotIntervalSelect: {
                      container: "mb-4",
                      label: "text-purple-700",
                      select: "border border-purple-300 rounded-md text-purple-900 bg-white",
                      innerClassNames: {
                        input: "text-purple-900",
                        option: "text-purple-700 hover:bg-purple-200",
                        control: "border-purple-300",
                        singleValue: "text-purple-900",
                        valueContainer: "bg-purple-100",
                      },
                    },
                  },

                  bookingFrequencyLimit: {
                    container: "border border-purple-200 bg-purple-100 rounded-lg",
                    label: "text-purple-700",
                    description: "text-purple-500",
                    children: "space-y-4",
                    intervalLimitContainer: "space-y-2",
                    intervalLimitItem: {
                      addLimitButton: "text-purple-500 hover:bg-purple-200 rounded-md",
                      limitText: "border border-purple-300 rounded-md text-purple-900 bg-white",
                      limitSelect: {
                        select: "border border-purple-300 rounded-md text-purple-900 bg-purple-50",
                        innerClassNames: {
                          input: "text-purple-900",
                          option: "text-purple-700 hover:bg-purple-200",
                          control: "border-purple-300",
                          singleValue: "text-purple-900",
                          valueContainer: "bg-purple-100",
                        },
                      },
                      container: "flex items-center space-x-2",
                    },
                  },

                  firstAvailableSlotOnly: {
                    container: "border border-purple-200 bg-purple-100 rounded-lg",
                    label: "text-purple-700",
                    description: "text-purple-500",
                    children: "space-y-4",
                  },

                  totalDurationLimit: {
                    container: "border border-purple-200 bg-purple-100 rounded-lg",
                    label: "text-purple-700",
                    description: "text-purple-500",
                    children: "space-y-4",
                    intervalLimitItem: {
                      addLimitButton: "text-purple-500 hover:bg-purple-200 rounded-md",
                      limitText: "border border-purple-300 rounded-md text-purple-900 bg-white",
                      limitSelect: {
                        select: "border border-purple-300 rounded-md text-purple-900 bg-purple-50",
                        innerClassNames: {
                          input: "text-purple-900",
                          option: "text-purple-700 hover:bg-purple-200",
                          control: "border-purple-300",
                          singleValue: "text-purple-900",
                          valueContainer: "bg-purple-100",
                        },
                      },
                      container: "flex items-center space-x-2",
                    },
                  },

                  futureBookingLimit: {
                    container: "border border-purple-200 bg-purple-100 rounded-lg",
                    label: "text-purple-700",
                    description: "text-purple-500",
                    children: "space-y-4",
                    rollingLimit: {
                      container: "flex items-center space-x-2",
                      textField: "border border-purple-300 rounded-md text-purple-900 bg-white",
                      periodTypeSelect: {
                        select: "border border-purple-300 rounded-md text-purple-900 bg-purple-50",
                        innerClassNames: {
                          input: "text-purple-900",
                          option: "text-purple-700 hover:bg-purple-200",
                          control: "border-purple-300",
                          singleValue: "text-purple-900",
                          valueContainer: "bg-purple-100",
                        },
                      },
                    },
                    rangeLimit: {
                      wrapper: "flex items-center space-x-2",
                      datePickerWraper: "border border-purple-300 rounded-md bg-white",
                      datePicker: "text-purple-900 bg-white",
                    },
                  },

                  offsetStartTimes: {
                    container: "border border-purple-200 bg-purple-100 rounded-lg",
                    label: "text-purple-700",
                    description: "text-purple-500",
                    children: "space-y-4",
                    offsetInput: {
                      container: "flex items-center space-x-2",
                      label: "text-purple-700",
                      input: "border border-purple-300 rounded-md text-purple-900 bg-white",
                      addOn: "text-purple-500",
                    },
                  },
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
