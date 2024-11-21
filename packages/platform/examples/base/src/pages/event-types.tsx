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
                eventAssignmentTab: {
                  assignmentType: {
                    container: "border border-purple-200 bg-white rounded-lg p-6",
                    label: "text-purple-700 font-semibold",
                    description: "text-gray-600 text-sm",
                    schedulingTypeSelect: {
                      container: "mt-2",
                      label: "text-purple-700",
                      select: "border border-purple-300 rounded-md bg-white",
                      innerClassNames: {
                        control: "border-purple-300",
                        input: "text-purple-900",
                        option: "hover:bg-purple-100",
                        menu: "border border-purple-200 rounded-md",
                        singleValue: "text-purple-700",
                      },
                    },
                  },
                  hosts: {
                    fixedHosts: {
                      container: "mt-4 border border-purple-200 bg-purple-50 rounded-lg p-6",
                      label: "text-purple-700 font-semibold",
                      description: "text-purple-600 text-sm",
                      addMembers: {
                        assingAllTeamMembers: {
                          container: "border border-purple-200 bg-white rounded-md",
                          label: "text-purple-700",
                          description: "text-gray-600",
                        },
                        teamMemberSelect: {
                          hostsSelect: {
                            container: "mt-2",
                            select: "border border-purple-300 rounded-md bg-white",
                            label: "text-purple-700",
                            innerClassNames: {
                              input: "text-purple-900",
                              option: "hover:bg-purple-100",
                              control: "border-purple-300",
                              singleValue: "text-purple-700",
                            },
                          },
                          selectedHostList: {
                            container: "mt-4 border border-purple-200 rounded-md bg-white",
                            listItem: {
                              container: "flex items-center gap-2 p-3 bg-white hover:bg-purple-50",
                              avatar: "rounded-full border border-purple-300",
                              name: "text-purple-800 font-semibold",
                              changePriorityButton: "text-purple-700 hover:bg-purple-100",
                              changeWeightButton: "text-purple-700 hover:bg-purple-100",
                              removeButton: "text-purple-600 hover:bg-purple-100",
                            },
                          },
                          priorityDialog: {
                            confirmButton: "bg-purple-700 text-white rounded-md px-4 py-2",
                            label: "text-purple-700",
                            select: "border border-purple-300 rounded-md bg-white",
                          },
                          weightDialog: {
                            container: "w-full bg-white p-4 rounded-md border border-purple-300",
                            label: "text-purple-700 font-semibold",
                            confirmButton: "bg-purple-700 text-white rounded-md px-4 py-2",
                            weightInput: {
                              container: "w-24",
                              label: "text-purple-700",
                              input: "border border-purple-300 rounded-md bg-white text-purple-900",
                              addOn: "text-purple-500",
                            },
                          },
                        },
                      },
                    },
                    roundRobinHosts: {
                      container: "mt-4 border border-purple-200 bg-purple-50 rounded-lg p-6",
                      label: "text-purple-700 font-semibold",
                      description: "text-purple-600 text-sm",
                      enableWeights: {
                        container: "border border-purple-200 bg-white rounded-md",
                        label: "text-purple-700",
                        description: "text-gray-600",
                      },
                      addMembers: {
                        assingAllTeamMembers: {
                          container: "border border-purple-200 bg-white rounded-md",
                          label: "text-purple-700",
                          description: "text-gray-600",
                        },
                        teamMemberSelect: {
                          hostsSelect: {
                            container: "mt-2",
                            select: "border border-purple-300 rounded-md bg-white",
                            label: "text-purple-700",
                            innerClassNames: {
                              input: "text-purple-900",
                              option: "hover:bg-purple-100",
                              control: "border-purple-300",
                              singleValue: "text-purple-700",
                            },
                          },
                          selectedHostList: {
                            container: "mt-4 border border-purple-200 rounded-md bg-white",
                            listItem: {
                              container: "flex items-center gap-2 p-3 bg-white hover:bg-purple-50",
                              avatar: "rounded-full border border-purple-300",
                              name: "text-purple-800 font-semibold",
                              changePriorityButton: "text-purple-700 hover:bg-purple-100",
                              changeWeightButton: "text-purple-700 hover:bg-purple-100",
                              removeButton: "text-purple-600 hover:bg-purple-100",
                            },
                          },
                        },
                      },
                    },
                  },
                  childrenEventTypes: {
                    container: "mt-4 border border-purple-200 bg-purple-50 rounded-lg p-6",
                    assignAllTeamMembers: {
                      container: "border border-purple-200 bg-white rounded-md",
                      label: "text-purple-700",
                      description: "text-gray-600",
                    },
                    childrenEventTypesList: {
                      assignToSelect: {
                        container: "mt-2",
                        select: "border border-purple-300 rounded-md bg-white",
                        label: "text-purple-700",
                        innerClassNames: {
                          input: "text-purple-900",
                          option: "hover:bg-purple-100",
                          control: "border-purple-300",
                          singleValue: "text-purple-700",
                        },
                      },
                      selectedChildrenList: {
                        container: "mt-4 border border-purple-200 rounded-md bg-white",
                        listItem: {
                          container: "flex items-center gap-2 p-3 bg-white hover:bg-purple-50",
                          avatar: "rounded-full border border-purple-300",
                          name: "text-purple-800 font-semibold",
                          ownerBadge: "text-purple-600 bg-purple-100 rounded-md px-2",
                          memberBadge: "text-purple-600 bg-purple-100 rounded-md px-2",
                          hiddenBadge: "text-gray-400 bg-gray-100 rounded-md px-2",
                          badgeContainer: "flex gap-1",
                          eventLink: "text-purple-700",
                          showOnProfileTooltip: "text-purple-600",
                          previewEventTypeTooltip: "text-purple-600",
                          previewEventTypeButton: "text-purple-700 hover:bg-purple-100",
                          deleteEventTypeTooltip: "text-red-500",
                          deleteEventTypeButton: "text-red-600 hover:bg-red-100",
                        },
                      },
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
