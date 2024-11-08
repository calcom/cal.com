import type { User } from "@prisma/client";

import { acrossQueryValueCompatiblity } from "@calcom/app-store/routing-forms/lib/raqbUtils";
import { getFieldResponse } from "@calcom/app-store/routing-forms/trpc/utils";
import type { FormResponse, Fields } from "@calcom/app-store/routing-forms/types/types";
import { zodRoutes, children1Schema } from "@calcom/app-store/routing-forms/zod";
import { BookingRepository } from "@calcom/lib/server/repository/booking";
import prisma from "@calcom/prisma";
import type { Booking } from "@calcom/prisma/client";
import type { AttributeType } from "@calcom/prisma/enums";
import { BookingStatus } from "@calcom/prisma/enums";

const { getAttributesQueryValue } = acrossQueryValueCompatiblity;

export enum DistributionMethod {
  PRIORITIZE_AVAILABILITY = "PRIORITIZE_AVAILABILITY",
  // BALANCED_ASSIGNMENT = "BALANCED_ASSIGNMENT",
  // ROUND_ROBIN (for fairness, rotating through assignees)
  // LOAD_BALANCED (ensuring an even workload)
}

type PartialBooking = Pick<Booking, "id" | "createdAt" | "userId" | "status"> & {
  attendees: { email: string | null }[];
};

type PartialUser = Pick<User, "id" | "email">;

interface GetLuckyUserParams<T extends PartialUser> {
  availableUsers: [T, ...T[]]; // ensure contains at least 1
  eventType: { id: number; isRRWeightsEnabled: boolean; team: { parentId?: number | null } | null };
  // all routedTeamMemberIds or all hosts of event types
  allRRHosts: {
    user: { id: number; email: string };
    createdAt: Date;
    weight?: number | null;
  }[];
  routingFormResponseId?: number;
}
// === dayjs.utc().startOf("month").toDate();
const startOfMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
// TS helper function.
const isNonEmptyArray = <T>(arr: T[]): arr is [T, ...T[]] => arr.length > 0;

async function leastRecentlyBookedUser<T extends PartialUser>({
  availableUsers,
  eventType,
  bookingsOfAvailableUsers,
}: GetLuckyUserParams<T> & { bookingsOfAvailableUsers: PartialBooking[] }) {
  // First we get all organizers (fixed host/single round robin user)
  const organizersWithLastCreated = await prisma.user.findMany({
    where: {
      id: {
        in: availableUsers.map((user) => user.id),
      },
    },
    select: {
      id: true,
      bookings: {
        select: {
          createdAt: true,
        },
        where: {
          eventTypeId: eventType.id,
          status: BookingStatus.ACCEPTED,
          attendees: {
            some: {
              noShow: false,
            },
          },
          // not:true won't match null, thus we need to do an OR with null case separately(for bookings that might have null value for `noShowHost` as earlier it didn't have default false)
          // https://github.com/calcom/cal.com/pull/15323#discussion_r1687728207
          OR: [
            {
              noShowHost: false,
            },
            {
              noShowHost: null,
            },
          ],
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  const organizerIdAndAtCreatedPair = organizersWithLastCreated.reduce(
    (keyValuePair: { [userId: number]: Date }, user) => {
      keyValuePair[user.id] = user.bookings[0]?.createdAt || new Date(0);
      return keyValuePair;
    },
    {}
  );

  const attendeeUserIdAndAtCreatedPair = bookingsOfAvailableUsers.reduce(
    (aggregate: { [userId: number]: Date }, booking) => {
      availableUsers.forEach((user) => {
        if (aggregate[user.id]) return; // Bookings are ordered DESC, so if the reducer aggregate
        // contains the user id, it's already got the most recent booking marked.
        if (!booking.attendees.map((attendee) => attendee.email).includes(user.email)) return;
        if (organizerIdAndAtCreatedPair[user.id] > booking.createdAt) return; // only consider bookings if they were created after organizer bookings
        aggregate[user.id] = booking.createdAt;
      });
      return aggregate;
    },
    {}
  );

  const userIdAndAtCreatedPair = {
    ...organizerIdAndAtCreatedPair,
    ...attendeeUserIdAndAtCreatedPair,
  };

  if (!userIdAndAtCreatedPair) {
    throw new Error("Unable to find users by availableUser ids."); // should never happen.
  }

  const leastRecentlyBookedUser = availableUsers.sort((a, b) => {
    if (userIdAndAtCreatedPair[a.id] > userIdAndAtCreatedPair[b.id]) return 1;
    else if (userIdAndAtCreatedPair[a.id] < userIdAndAtCreatedPair[b.id]) return -1;
    // if two (or more) dates are identical, we randomize the order
    else return Math.random() > 0.5 ? 1 : -1;
  })[0];

  return leastRecentlyBookedUser;
}

async function getHostsWithCalibration(
  eventTypeId: number,
  hosts: { userId: number; email: string; createdAt: Date }[],
  virtualQueuesData?: VirtualQueuesDataType
) {
  const [newHostsArray, existingBookings] = await Promise.all([
    prisma.host.findMany({
      where: {
        userId: {
          in: hosts.map((host) => host.userId),
        },
        eventTypeId,
        isFixed: false,
        createdAt: {
          gte: startOfMonth,
        },
      },
    }),
    BookingRepository.getAllBookingsForRoundRobin({
      eventTypeId,
      users: hosts.map((host) => ({
        id: host.userId,
        email: host.email,
      })),
      startDate: startOfMonth,
      endDate: new Date(),
      virtualQueuesData,
    }),
  ]);
  // Return early if there are no new hosts or no existing bookings
  if (newHostsArray.length === 0 || existingBookings.length === 0) {
    return hosts.map((host) => ({ ...host, calibration: 0 }));
  }
  // Helper function to calculate calibration for a new host
  function calculateCalibration(newHost: { userId: number; createdAt: Date }) {
    const existingBookingsBeforeAdded = existingBookings.filter(
      (booking) => booking.userId !== newHost.userId && booking.createdAt < newHost.createdAt
    );
    const hostsAddedBefore = hosts.filter(
      (host) => host.userId !== newHost.userId && host.createdAt < newHost.createdAt
    );
    return existingBookingsBeforeAdded.length && hostsAddedBefore.length
      ? existingBookingsBeforeAdded.length / hostsAddedBefore.length
      : 0;
  }
  // Calculate calibration for each new host and store in a Map
  const newHostsWithCalibration = new Map(
    newHostsArray.map((newHost) => [
      newHost.userId,
      { ...newHost, calibration: calculateCalibration(newHost) },
    ])
  );
  // Map hosts with their respective calibration values
  return hosts.map((host) => ({
    ...host,
    calibration: newHostsWithCalibration.get(host.userId)?.calibration ?? 0,
  }));
}

function getUsersWithHighestPriority<T extends PartialUser & { priority?: number | null }>({
  availableUsers,
}: {
  availableUsers: T[];
}) {
  const highestPriority = Math.max(...availableUsers.map((user) => user.priority ?? 2));
  const usersWithHighestPriority = availableUsers.filter(
    (user) => user.priority === highestPriority || (user.priority == null && highestPriority === 2)
  );
  if (!isNonEmptyArray(usersWithHighestPriority)) {
    throw new Error("Internal Error: Highest Priority filter should never return length=0.");
  }
  return usersWithHighestPriority;
}

async function filterUsersBasedOnWeights<
  T extends PartialUser & {
    weight?: number | null;
  }
>({
  availableUsers,
  bookingsOfAvailableUsers,
  allRRHosts,
  eventType,
  virtualQueuesData,
  attributeWeights,
}: GetLuckyUserParams<T> & {
  bookingsOfAvailableUsers: PartialBooking[];
  virtualQueuesData?: VirtualQueuesDataType;
  attributeWeights?: {
    userId: number;
    weight: number;
  }[];
}): Promise<[T, ...T[]]> {
  //get all bookings of all other RR hosts that are not available
  const availableUserIds = new Set(availableUsers.map((user) => user.id));

  const notAvailableHosts = allRRHosts.reduce(
    (
      acc: {
        id: number;
        email: string;
      }[],
      host
    ) => {
      if (!availableUserIds.has(host.user.id)) {
        acc.push({
          id: host.user.id,
          email: host.user.email,
        });
      }
      return acc;
    },
    []
  );

  //only get bookings where response matches the virtual queue
  const bookingsOfNotAvailableUsers = await BookingRepository.getAllBookingsForRoundRobin({
    eventTypeId: eventType.id,
    users: notAvailableHosts,
    startDate: startOfMonth,
    endDate: new Date(),
    virtualQueuesData,
  });

  const allBookings = bookingsOfAvailableUsers.concat(bookingsOfNotAvailableUsers);

  //todo: check this function
  const allHostsWithCalibration = await getHostsWithCalibration(
    eventType.id,
    allRRHosts.map((host) => {
      return { email: host.user.email, userId: host.user.id, createdAt: host.createdAt };
    }),
    virtualQueuesData
  );

  // Calculate the total calibration and weight of all round-robin hosts
  let totalWeight: number;

  if (attributeWeights) {
    totalWeight = attributeWeights.reduce((totalWeight, userWeight) => {
      totalWeight += userWeight.weight ?? 100;
      return totalWeight;
    }, 0);
  } else {
    const totalWeight = allRRHosts.reduce((totalWeight, host) => {
      totalWeight += host.weight ?? 100;
      return totalWeight;
    }, 0);
  }

  const totalCalibration = allHostsWithCalibration.reduce((totalCalibration, host) => {
    totalCalibration += host.calibration;
    return totalCalibration;
  }, 0);

  // Calculate booking shortfall for each available user
  const usersWithBookingShortfalls = availableUsers.map((user) => {
    //todo: it's not user.weight, we need to calculate it from the user's attirbutes weights

    let userWeight = user.weight ?? 100;

    if (attributeWeights) {
      userWeight = attributeWeights.find((userWeight) => userWeight.userId === user.id)?.weight ?? 100;
    }

    const targetPercentage = (userWeight ?? 100) / totalWeight;

    const userBookings = bookingsOfAvailableUsers.filter(
      (booking) =>
        booking.userId === user.id || booking.attendees.some((attendee) => attendee.email === user.email)
    );

    const targetNumberOfBookings = (allBookings.length + totalCalibration) * targetPercentage;

    const userCalibration = allHostsWithCalibration.find((host) => host.userId === user.id)?.calibration ?? 0;

    const bookingShortfall = targetNumberOfBookings - (userBookings.length + userCalibration);

    return {
      ...user,
      bookingShortfall,
    };
  });

  // Find users with the highest booking shortfall
  const maxShortfall = Math.max(...usersWithBookingShortfalls.map((user) => user.bookingShortfall));
  const usersWithMaxShortfall = usersWithBookingShortfalls.filter(
    (user) => user.bookingShortfall === maxShortfall
  );

  // ff more user's were found, find users with highest weights
  const maxWeight = Math.max(...usersWithMaxShortfall.map((user) => user.weight ?? 100));

  const userIdsWithMaxShortfallAndWeight = new Set(
    usersWithMaxShortfall.filter((user) => user.weight === maxWeight).map((user) => user.id)
  );
  const remainingUsersAfterWeightFilter = availableUsers.filter((user) =>
    userIdsWithMaxShortfallAndWeight.has(user.id)
  );
  if (!isNonEmptyArray(remainingUsersAfterWeightFilter)) {
    throw new Error("Internal Error: Weight filter should never return length=0.");
  }
  return remainingUsersAfterWeightFilter;
}

type AttributeWithWeights = {
  name: string;
  slug: string;
  type: AttributeType;
  id: string;
  options: {
    id: string;
    value: string;
    slug: string;
    assignedUsers: {
      weight: number | null;
      member: {
        userId: number;
      };
    }[];
  }[];
};

async function getQueueAndAttributeWeightData<T extends PartialUser & { priority?: number | null }>(
  allRRHosts: GetLuckyUserParams<T>["allRRHosts"],
  routingFormResponseId: number,
  attributeWithWeights: AttributeWithWeights
) {
  // variable to return
  let averageWeightsHosts: { userId: number; weight: number }[] = [];

  const routingFormResponse = await prisma.app_RoutingForms_FormResponse.findFirst({
    where: {
      id: routingFormResponseId,
    },
    select: {
      response: true,
      form: {
        select: {
          routes: true,
          fields: true,
        },
      },
      chosenRouteId: true,
    },
  });

  const chosenRouteId = routingFormResponse?.chosenRouteId ?? undefined;

  if (!chosenRouteId) return;

  let fieldOptionData: { fieldId: string; selectedOptionIds: string | number | string[] } | undefined;

  const routingForm = routingFormResponse?.form;

  if (routingForm && routingFormResponse) {
    const response = routingFormResponse.response as FormResponse;

    const routes = zodRoutes.parse(routingForm.routes);
    const chosenRoute = routes?.find((route) => route.id === routingFormResponse.chosenRouteId);

    if (chosenRoute && "attributesQueryValue" in chosenRoute) {
      const parsedAttributesQueryValue = children1Schema.parse(chosenRoute.attributesQueryValue);

      const attributesQueryValueWithLabel = getAttributesQueryValue({
        attributesQueryValue: chosenRoute.attributesQueryValue,
        attributes: [attributeWithWeights],
        response,
        fields: routingFormResponse.form.fields as Fields,
        getFieldResponse: getFieldResponse,
      });

      const parsedAttributesQueryValueWithLabel = children1Schema.parse(attributesQueryValueWithLabel);

      if (parsedAttributesQueryValueWithLabel && parsedAttributesQueryValueWithLabel.children1) {
        averageWeightsHosts = getAverageAttributeWeights(
          allRRHosts,
          parsedAttributesQueryValueWithLabel.children1,
          attributeWithWeights
        );
      }

      if (parsedAttributesQueryValue && parsedAttributesQueryValue.children1) {
        fieldOptionData = getAttributesForVirtualQueues(
          response,
          parsedAttributesQueryValue.children1,
          attributeWithWeights
        );
      }
    }
  }

  if (fieldOptionData) {
    return { averageWeightsHosts, virtualQueuesData: { chosenRouteId, fieldOptionData } };
  }

  return;
}

// this will only use the weight for the first rule that uses that the attribute that has weights enabled
function getAverageAttributeWeights(
  allRRHosts: GetLuckyUserParams<T>["allRRHosts"],
  attributesQueryValueChild: Record<
    string,
    {
      type?: string | undefined;
      properties?:
        | {
            field?: any;
            operator?: any;
            value?: any;
            valueSrc?: any;
          }
        | undefined;
    }
  >,
  attributeWithWeights: AttributeWithWeights
) {
  let averageWeightsHosts: { userId: number; weight: number }[] = [];

  const fieldValueArray = Object.values(attributesQueryValueChild).map((child) => ({
    field: child.properties?.field,
    value: child.properties?.value,
  }));

  fieldValueArray.map((obj) => {
    const attributeId = obj.field;
    const allRRHostsWeights = new Map<number, number[]>();

    if (attributeId === attributeWithWeights.id) {
      obj.value.forEach((arrayobj) => {
        arrayobj.forEach((attributeOption) => {
          // attributeOption is either optionId or label, we only care about labels here
          const attributeOptionWithUsers = attributeWithWeights.options.find(
            (option) => option.value.toLowerCase() === attributeOption.toLowerCase()
          );

          allRRHosts.forEach((rrHost) => {
            const weight = attributeOptionWithUsers?.assignedUsers.find(
              (assignedUser) => rrHost.user.id === assignedUser.member.userId
            )?.weight;

            if (weight) {
              if (allRRHostsWeights.has(rrHost.user.id)) {
                allRRHostsWeights.get(rrHost.user.id)?.push(weight);
              } else {
                allRRHostsWeights.set(rrHost.user.id, [weight]);
              }
            }
          });
        });
      });
      averageWeightsHosts = Array.from(allRRHostsWeights.entries()).map(([userId, weights]) => {
        const totalWeight = weights.reduce((acc, weight) => acc + weight, 0);
        const averageWeight = totalWeight / weights.length;

        return {
          userId,
          weight: averageWeight,
        };
      });
    }
  });

  return averageWeightsHosts;
}

type VirtualQueuesDataType = {
  chosenRouteId: string;
  fieldOptionData: {
    fieldId: string;
    selectedOptionIds: string | number | string[];
  };
};

function getAttributesForVirtualQueues(
  response: Record<string, Pick<FormResponse[keyof FormResponse], "value">>,
  attributesQueryValueChild: Record<
    string,
    {
      type?: string | undefined;
      properties?:
        | {
            field?: any;
            operator?: any;
            value?: any;
            valueSrc?: any;
          }
        | undefined;
    }
  >,
  attributeWithWeights: { id: string }
) {
  let selectionOptions: Pick<VirtualQueuesDataType, "fieldOptionData">["fieldOptionData"] | undefined;

  const fieldValueArray = Object.values(attributesQueryValueChild).map((child) => ({
    field: child.properties?.field,
    value: child.properties?.value,
  }));

  fieldValueArray.some((obj) => {
    const attributeId = obj.field;

    if (attributeId === attributeWithWeights.id) {
      obj.value.some((arrayobj) => {
        arrayobj.some((attributeOptionId) => {
          const content = attributeOptionId.slice(1, -1);

          const routingFormFieldId = content.includes("field:") ? content.split("field:")[1] : null;

          if (routingFormFieldId) {
            const fieldResponse = response[routingFormFieldId];
            selectionOptions = { fieldId: routingFormFieldId, selectedOptionIds: fieldResponse.value };
            return true; // break out of all loops
          }
        });
      });
    }
  });
  return selectionOptions;
}

// TODO: Configure distributionAlgorithm from the event type configuration
// TODO: Add 'MAXIMIZE_FAIRNESS' algorithm.
export async function getLuckyUser<
  T extends PartialUser & {
    priority?: number | null;
    weight?: number | null;
  }
>(
  distributionMethod: DistributionMethod = DistributionMethod.PRIORITIZE_AVAILABILITY,
  { availableUsers, ...getLuckyUserParams }: GetLuckyUserParams<T>
) {
  //maybe pass response directly not id
  const { eventType, routingFormResponseId } = getLuckyUserParams;

  let attributeWeights;
  let virtualQueuesData;

  if (routingFormResponseId && getLuckyUserParams.eventType.team?.parentId) {
    const attributeWithEnabledWeights = await prisma.attribute.findFirst({
      where: {
        teamId: getLuckyUserParams.eventType.team?.parentId,
        isWeightsEnabled: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        options: {
          select: {
            id: true,
            value: true,
            slug: true,
            assignedUsers: {
              select: {
                member: {
                  select: {
                    userId: true,
                  },
                },
                weight: true,
              },
            },
          },
        },
      },
    });

    if (attributeWithEnabledWeights) {
      // Virtual queues are defined by the attribute that has weights and is use with 'Value of field ...'
      const queueAndAtributeWeightData = await getQueueAndAttributeWeightData(
        getLuckyUserParams.allRRHosts,
        routingFormResponseId,
        attributeWithEnabledWeights
      );

      if (queueAndAtributeWeightData?.averageWeightsHosts && queueAndAtributeWeightData?.virtualQueuesData) {
        attributeWeights = queueAndAtributeWeightData?.averageWeightsHosts;
        virtualQueuesData = queueAndAtributeWeightData?.virtualQueuesData;
      }
    }
  }

  // there is only one user
  if (availableUsers.length === 1) {
    return availableUsers[0];
  }
  const currentMonthBookingsOfAvailableUsers = await BookingRepository.getAllBookingsForRoundRobin({
    eventTypeId: eventType.id,
    users: availableUsers.map((user) => {
      return { id: user.id, email: user.email };
    }),
    startDate: startOfMonth,
    endDate: new Date(),
    virtualQueuesData,
  });

  switch (distributionMethod) {
    case DistributionMethod.PRIORITIZE_AVAILABILITY: {
      if (eventType.isRRWeightsEnabled) {
        availableUsers = await filterUsersBasedOnWeights({
          ...getLuckyUserParams,
          availableUsers,
          bookingsOfAvailableUsers: currentMonthBookingsOfAvailableUsers,
          virtualQueuesData,
          attributeWeights,
        });
      }
      const highestPriorityUsers = getUsersWithHighestPriority({ availableUsers });
      // No need to round-robin through the only user, return early also.
      if (highestPriorityUsers.length === 1) return highestPriorityUsers[0];
      // TS is happy.
      return leastRecentlyBookedUser({
        ...getLuckyUserParams,
        availableUsers: highestPriorityUsers,
        bookingsOfAvailableUsers: currentMonthBookingsOfAvailableUsers,
      });
    }
  }
}
