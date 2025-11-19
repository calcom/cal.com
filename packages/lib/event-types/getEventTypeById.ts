import type { Prisma } from "@prisma/client";

//import "server-only";
import { getLocationGroupedOptions } from "@calcom/app-store/server";
import { getEventTypeAppData } from "@calcom/app-store/utils";
import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { parseBookingLimit } from "@calcom/lib/intervalLimits/isBookingLimits";
import { parseDurationLimit } from "@calcom/lib/intervalLimits/isDurationLimits";
import { parseEventTypeColor } from "@calcom/lib/isEventTypeColor";
import { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
import type { LocationObject } from "@calcom/lib/location";
import { getTranslation } from "@calcom/lib/server/i18n";
import { EventTypeRepository } from "@calcom/lib/server/repository/eventTypeRepository";
import { UserRepository } from "@calcom/lib/server/repository/user";
import type { PrismaClient } from "@calcom/prisma";
import { SchedulingType, MembershipRole } from "@calcom/prisma/enums";
import { customInputSchema, eventTypeMetaDataSchemaWithTypedApps } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import { WEBSITE_URL } from "../constants";
import { getBookerBaseUrl } from "../getBookerUrl/server";

interface getEventTypeByIdProps {
  eventTypeId: number;
  userId: number;
  prisma: PrismaClient;
  isTrpcCall?: boolean;
  isUserOrganizationAdmin: boolean;
  currentOrganizationId: number | null;
}
interface getEventTypeByIdForCalIdProps {
  eventTypeId: number;
  userId: number;
  prisma: PrismaClient;
  isTrpcCall?: boolean;
  isUserOrganizationAdmin: boolean;
  currentOrganizationId: number | null;
}

export type EventType = Awaited<ReturnType<typeof getEventTypeById>>;
// Type for the new function
export type EventTypeForCalId = Awaited<ReturnType<typeof getEventTypeByIdForCalId>>;

export const getEventTypeById = async ({
  currentOrganizationId,
  eventTypeId,
  userId,
  prisma,
  isTrpcCall = false,
  isUserOrganizationAdmin,
}: getEventTypeByIdProps) => {
  const userSelect = {
    name: true,
    avatarUrl: true,
    username: true,
    id: true,
    email: true,
    locale: true,
    defaultScheduleId: true,
    isPlatformManaged: true,
    timeZone: true,
  } satisfies Prisma.UserSelect;

  const rawEventType = await getRawEventType({
    userId,
    eventTypeId,
    isUserOrganizationAdmin,
    currentOrganizationId,
    prisma,
  });

  if (!rawEventType) {
    if (isTrpcCall) {
      throw new TRPCError({ code: "NOT_FOUND" });
    } else {
      throw new Error("Event type not found");
    }
  }

  const { locations, metadata, ...restEventType } = rawEventType;
  const newMetadata = eventTypeMetaDataSchemaWithTypedApps.parse(metadata || {}) || {};
  const apps = newMetadata?.apps || {};
  const eventTypeWithParsedMetadata = { ...rawEventType, metadata: newMetadata };
  const userRepo = new UserRepository(prisma);
  const eventTeamMembershipsWithUserProfile = [];
  for (const eventTeamMembership of rawEventType.team?.members || []) {
    eventTeamMembershipsWithUserProfile.push({
      ...eventTeamMembership,
      user: await userRepo.enrichUserWithItsProfile({
        user: eventTeamMembership.user,
      }),
    });
  }

  const childrenWithUserProfile = [];
  for (const child of rawEventType.children || []) {
    childrenWithUserProfile.push({
      ...child,
      owner: child.owner
        ? await userRepo.enrichUserWithItsProfile({
            user: child.owner,
          })
        : null,
    });
  }

  const eventTypeUsersWithUserProfile = [];
  for (const eventTypeUser of rawEventType.users) {
    eventTypeUsersWithUserProfile.push(
      await userRepo.enrichUserWithItsProfile({
        user: eventTypeUser,
      })
    );
  }

  newMetadata.apps = {
    ...apps,
    giphy: getEventTypeAppData(eventTypeWithParsedMetadata, "giphy", true),
  };

  const parsedMetaData = newMetadata;

  const parsedCustomInputs = (rawEventType.customInputs || []).map((input) => customInputSchema.parse(input));

  const eventType = {
    ...restEventType,
    schedule:
      rawEventType.schedule?.id ||
      (!rawEventType.team ? rawEventType.users[0]?.defaultScheduleId : null) ||
      null,
    restrictionScheduleId: rawEventType.restrictionScheduleId || null,
    restrictionScheduleName: rawEventType.restrictionSchedule?.name || null,
    useBookerTimezone: rawEventType.useBookerTimezone || false,
    instantMeetingSchedule: rawEventType.instantMeetingSchedule?.id || null,
    scheduleName: rawEventType.schedule?.name || null,
    recurringEvent: parseRecurringEvent(restEventType.recurringEvent),
    bookingLimits: parseBookingLimit(restEventType.bookingLimits),
    durationLimits: parseDurationLimit(restEventType.durationLimits),
    eventTypeColor: parseEventTypeColor(restEventType.eventTypeColor),
    locations: locations as unknown as LocationObject[],
    metadata: parsedMetaData,
    customInputs: parsedCustomInputs,
    users: rawEventType.users,
    bookerUrl: restEventType.team
      ? await getBookerBaseUrl(restEventType.team.parentId)
      : restEventType.owner
      ? await getBookerBaseUrl(currentOrganizationId)
      : WEBSITE_URL,
    children: childrenWithUserProfile.flatMap((ch) =>
      ch.owner !== null
        ? {
            ...ch,
            owner: {
              ...ch.owner,
              avatar: getUserAvatarUrl(ch.owner),
              email: ch.owner.email,
              name: ch.owner.name ?? "",
              username: ch.owner.username ?? "",
              membership:
                restEventType.team?.members.find((tm) => tm.user.id === ch.owner?.id)?.role ||
                MembershipRole.MEMBER,
            },
            created: true,
          }
        : []
    ),
  };

  // backwards compat
  if (eventType.users.length === 0 && !eventType.team) {
    const fallbackUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: userSelect,
    });
    if (!fallbackUser) {
      if (isTrpcCall) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "The event type doesn't have user and no fallback user was found",
        });
      } else {
        throw Error("The event type doesn't have user and no fallback user was found");
      }
    }
    eventType.users.push(fallbackUser);
  }

  const eventTypeUsers: ((typeof eventType.users)[number] & { avatar: string })[] =
    eventTypeUsersWithUserProfile.map((user) => ({
      ...user,
      avatar: getUserAvatarUrl(user),
    }));

  const currentUser = eventType.users.find((u) => u.id === userId);

  const t = await getTranslation(currentUser?.locale ?? "en", "common");

  if (!currentUser?.id && !eventType.teamId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Could not find user or team",
    });
  }

  const locationOptions = await getLocationGroupedOptions(
    eventType.teamId ? { teamId: eventType.teamId } : { userId },
    t
  );
  if (eventType.schedulingType === SchedulingType.MANAGED) {
    locationOptions.splice(0, 0, {
      label: t("default"),
      options: [
        {
          label: t("members_default_location"),
          value: "",
          icon: "/user-check.svg",
        },
      ],
    });
  }

  const isOrgTeamEvent = !!eventType?.teamId && !!eventType.team?.parentId;
  const eventTypeObject = Object.assign({}, eventType, {
    users: eventTypeUsers,
    periodStartDate: eventType.periodStartDate?.toString() ?? null,
    periodEndDate: eventType.periodEndDate?.toString() ?? null,
    bookingFields: getBookingFieldsWithSystemFields({
      ...eventType,
      isOrgTeamEvent,
      workflows: eventType.calIdWorkflows,
    }),
  });

  const isOrgEventType = !!eventTypeObject.team?.parentId;
  const teamMembers = eventTypeObject.team
    ? eventTeamMembershipsWithUserProfile
        .filter((member) => member.accepted || isOrgEventType)
        .map((member) => {
          const user: typeof member.user & { avatar: string } = {
            ...member.user,
            avatar: getUserAvatarUrl(member.user),
          };
          return {
            ...user,
            profileId: user.profile.id,
            eventTypes: user.eventTypes?.map((evTy: any) => evTy.slug) || [],
            membership: member.role,
          };
        })
    : [];

  // Find the current users membership so we can check role to enable/disable deletion.
  // Sets to null if no membership is found - this must mean we are in a none team event type
  const currentUserMembership =
    eventTypeObject.team?.members.find((el: any) => el.user.id === userId) ?? null;

  let destinationCalendar = eventTypeObject.destinationCalendar;
  if (!destinationCalendar) {
    destinationCalendar = await prisma.destinationCalendar.findFirst({
      where: {
        userId: userId,
        eventTypeId: null,
      },
    });
  }

  const finalObj = {
    eventType: eventTypeObject,
    locationOptions,
    destinationCalendar,
    team: eventTypeObject.team || null,
    teamMembers,
    currentUserMembership,
    isUserOrganizationAdmin,
  };
  return finalObj;
};

export async function getRawEventType({
  userId,
  eventTypeId,
  isUserOrganizationAdmin,
  currentOrganizationId,
  prisma,
}: Omit<getEventTypeByIdProps, "isTrpcCall">) {
  const eventTypeRepo = new EventTypeRepository(prisma);

  if (isUserOrganizationAdmin && currentOrganizationId) {
    return await eventTypeRepo.findByIdForOrgAdmin({
      id: eventTypeId,
      organizationId: currentOrganizationId,
    });
  }

  return await eventTypeRepo.findById({
    id: eventTypeId,
    userId,
  });
}

export const getEventTypeByIdForCalId = async ({
  currentOrganizationId,
  eventTypeId,
  userId,
  prisma,
  isTrpcCall = false,
  isUserOrganizationAdmin,
}: getEventTypeByIdForCalIdProps) => {
  const userSelect = {
    name: true,
    avatarUrl: true,
    username: true,
    id: true,
    email: true,
    locale: true,
    defaultScheduleId: true,
    isPlatformManaged: true,
    timeZone: true,
  } satisfies Prisma.UserSelect;

  const rawEventType = await getRawEventTypeForCalId({
    userId,
    eventTypeId,
    isUserOrganizationAdmin,
    currentOrganizationId,
    prisma,
  });
  console.log("rawEventType__", rawEventType);

  if (!rawEventType) {
    if (isTrpcCall) {
      throw new TRPCError({ code: "NOT_FOUND" });
    } else {
      throw new Error("Event type not found");
    }
  }

  const { locations, metadata, ...restEventType } = rawEventType;
  const newMetadata = eventTypeMetaDataSchemaWithTypedApps.parse(metadata || {}) || {};
  const apps = newMetadata?.apps || {};
  const eventTypeWithParsedMetadata = { ...rawEventType, metadata: newMetadata };
  const userRepo = new UserRepository(prisma);
  const calIdTeamMembershipsWithUserProfile = [];
  for (const calIdTeamMembership of (rawEventType as any).calIdTeam?.members || []) {
    calIdTeamMembershipsWithUserProfile.push({
      ...calIdTeamMembership,
      user: await userRepo.enrichUserWithItsProfile({
        user: calIdTeamMembership.user,
      }),
    });
  }

  const childrenWithUserProfile = [];
  for (const child of rawEventType.children || []) {
    childrenWithUserProfile.push({
      ...child,
      owner: child.owner
        ? await userRepo.enrichUserWithItsProfile({
            user: child.owner,
          })
        : null,
    });
  }

  const eventTypeUsersWithUserProfile = [];
  for (const eventTypeUser of rawEventType.users) {
    eventTypeUsersWithUserProfile.push(
      await userRepo.enrichUserWithItsProfile({
        user: eventTypeUser,
      })
    );
  }

  newMetadata.apps = {
    ...apps,
    giphy: getEventTypeAppData(eventTypeWithParsedMetadata, "giphy", true),
  };

  const parsedMetaData = newMetadata;

  const parsedCustomInputs = (rawEventType.customInputs || []).map((input) => customInputSchema.parse(input));

  const eventType = {
    ...restEventType,
    calIdTeamId: (rawEventType as any).calIdTeamId,
    calIdTeam: (rawEventType as any).calIdTeam,
    schedule:
      rawEventType.schedule?.id ||
      (!(rawEventType as any).calIdTeam ? rawEventType.users[0]?.defaultScheduleId : null) ||
      null,
    restrictionScheduleId: rawEventType.restrictionScheduleId || null,
    restrictionScheduleName: rawEventType.restrictionSchedule?.name || null,
    useBookerTimezone: rawEventType.useBookerTimezone || false,
    instantMeetingSchedule: rawEventType.instantMeetingSchedule?.id || null,
    scheduleName: rawEventType.schedule?.name || null,
    recurringEvent: parseRecurringEvent(restEventType.recurringEvent),
    bookingLimits: parseBookingLimit(restEventType.bookingLimits),
    durationLimits: parseDurationLimit(restEventType.durationLimits),
    eventTypeColor: parseEventTypeColor(restEventType.eventTypeColor),
    locations: locations as unknown as LocationObject[],
    metadata: parsedMetaData,
    customInputs: parsedCustomInputs,
    users: rawEventType.users,
    bookerUrl: (rawEventType as any).calIdTeam
      ? await getBookerBaseUrl((rawEventType as any).calIdTeam.parentId)
      : rawEventType.owner
      ? await getBookerBaseUrl(currentOrganizationId)
      : WEBSITE_URL,
    children: childrenWithUserProfile.flatMap((ch) =>
      ch.owner !== null
        ? {
            ...ch,
            owner: {
              ...ch.owner,
              avatar: getUserAvatarUrl(ch.owner),
              email: ch.owner.email,
              name: ch.owner.name ?? "",
              username: ch.owner.username ?? "",
              membership:
                (rawEventType as any).calIdTeam?.members.find((tm: any) => tm.user.id === ch.owner?.id)
                  ?.role || MembershipRole.MEMBER,
            },
            created: true,
          }
        : []
    ),
  };

  // backwards compats
  if (eventType.users.length === 0 && !(eventType as any).calIdTeam) {
    const fallbackUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: userSelect,
    });
    if (!fallbackUser) {
      if (isTrpcCall) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "The event type doesn't have user and no fallback user was found",
        });
      } else {
        throw Error("The event type doesn't have user and no fallback user was found");
      }
    }
    eventType.users.push(fallbackUser);
  }

  const eventTypeUsers: ((typeof eventType.users)[number] & { avatar: string })[] =
    eventTypeUsersWithUserProfile.map((user) => ({
      ...user,
      avatar: getUserAvatarUrl(user),
    }));

  const currentUser = eventType.users.find((u) => u.id === userId);

  const t = await getTranslation(currentUser?.locale ?? "en", "common");

  if (!currentUser?.id && !(eventType as any).calIdTeam) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Could not find user or team",
    });
  }

  const locationOptions = await getLocationGroupedOptions(
    (eventType as any).calIdTeamId ? { teamId: (eventType as any).calIdTeamId } : { userId },
    t
  );
  if (eventType.schedulingType === SchedulingType.MANAGED) {
    locationOptions.splice(0, 0, {
      label: t("default"),
      options: [
        {
          label: t("members_default_location"),
          value: "",
          icon: "/user-check.svg",
        },
      ],
    });
  }

  const isOrgTeamEvent = !!(eventType as any)?.calIdTeam;
  const eventTypeObject = Object.assign({}, eventType, {
    users: eventTypeUsers,
    periodStartDate: eventType.periodStartDate?.toString() ?? null,
    periodEndDate: eventType.periodEndDate?.toString() ?? null,
    bookingFields: getBookingFieldsWithSystemFields({
      ...eventType,
      isOrgTeamEvent,
      workflows: eventType.calIdWorkflows,
    }),
  });

  const isOrgEventType = !!(eventTypeObject as any).calIdTeam?.parentId;
  const teamMembers = (eventTypeObject as any).calIdTeam
    ? calIdTeamMembershipsWithUserProfile
        .filter((member) => member.acceptedInvitation || isOrgEventType)
        .map((member) => {
          const user: typeof member.user & { avatar: string } = {
            ...member.user,
            avatar: getUserAvatarUrl(member.user),
          };
          return {
            ...user,
            profileId: user.profile.id,
            eventTypes: user.eventTypes?.map((evTy: any) => evTy.slug) || [],
            membership: member.role,
          };
        })
    : [];

  // Find the current users membership so we can check role to enable/disable deletion.
  // Sets to null if no membership is found - this must mean we are in a none team event type
  const currentUserMembership =
    (eventTypeObject as any).calIdTeam?.members.find((el: any) => el.user.id === userId) ?? null;

  let destinationCalendar = eventTypeObject.destinationCalendar;
  if (!destinationCalendar) {
    destinationCalendar = await prisma.destinationCalendar.findFirst({
      where: {
        userId: userId,
        eventTypeId: null,
      },
    });
  }

  const finalObj = {
    eventType: {
      ...eventTypeObject,
      bookerUrl: (eventTypeObject as any).calIdTeam
        ? await getBookerBaseUrl((eventTypeObject as any).calIdTeam.parentId)
        : eventTypeObject.owner
        ? await getBookerBaseUrl(currentOrganizationId)
        : WEBSITE_URL,
    },
    locationOptions,
    destinationCalendar,
    team: (eventTypeObject as any).calIdTeam || null,
    teamMembers,
    currentUserMembership,
    isUserOrganizationAdmin,
  };
  return finalObj;
};

export async function getRawEventTypeForCalId({
  userId,
  eventTypeId,
  isUserOrganizationAdmin,
  currentOrganizationId,
  prisma,
}: Omit<getEventTypeByIdForCalIdProps, "isTrpcCall">) {
  const eventTypeRepo = new EventTypeRepository(prisma);

  if (isUserOrganizationAdmin && currentOrganizationId) {
    return await eventTypeRepo.findByIdForOrgAdmin({
      id: eventTypeId,
      organizationId: currentOrganizationId,
    });
  }

  return await eventTypeRepo.findByIdForCalId({
    id: eventTypeId,
    userId,
  });
}

export default getEventTypeById;
