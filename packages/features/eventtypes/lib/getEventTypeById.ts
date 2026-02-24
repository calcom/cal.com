//import "server-only";
import type { LocationObject } from "@calcom/app-store/locations";
import { getLocationGroupedOptions } from "@calcom/app-store/server";
import { getEventTypeAppData } from "@calcom/app-store/utils";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import { getOrganizationRepository } from "@calcom/features/ee/organizations/di/OrganizationRepository.container";
import { getBookerBaseUrl } from "@calcom/features/ee/organizations/lib/getBookerUrlServer";
import { OrganizationRepository } from "@calcom/features/ee/organizations/repositories/OrganizationRepository";
import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { parseBookingLimit } from "@calcom/lib/intervalLimits/isBookingLimits";
import { parseDurationLimit } from "@calcom/lib/intervalLimits/isDurationLimits";
import { parseEventTypeColor } from "@calcom/lib/isEventTypeColor";
import { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
import { getTranslation } from "@calcom/lib/server/i18n";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";
import { customInputSchema } from "@calcom/prisma/zod-utils";
import { TRPCError } from "@trpc/server";

interface getEventTypeByIdProps {
  eventTypeId: number;
  userId: number;
  prisma: PrismaClient;
  isTrpcCall?: boolean;
  isUserOrganizationAdmin: boolean;
  currentOrganizationId: number | null;
  userLocale?: string | null;
}

export type EventType = Awaited<ReturnType<typeof getEventTypeById>>;

export const getEventTypeById = async ({
  currentOrganizationId,
  eventTypeId,
  userId,
  prisma,
  isTrpcCall = false,
  isUserOrganizationAdmin,
  userLocale,
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
    childrenCount: rawEventType._count?.children ?? 0,
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
    rawEventType.users.map((user) => ({
      ...user,
      avatar: getUserAvatarUrl(user),
    }));

  const currentUser = eventType.users.find((u) => u.id === userId);

  const t = await getTranslation(userLocale ?? currentUser?.locale ?? "en", "common");

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
    bookingFields: getBookingFieldsWithSystemFields({ ...eventType, isOrgTeamEvent }),
  });

  const isOrgEventType = !!eventTypeObject.team?.parentId;

  // Find the current user's membership role to enable/disable deletion in the UI.
  // Null when not a team event type.
  const membershipRepo = new MembershipRepository(prisma);
  const currentUserMembership = rawEventType.team
    ? await membershipRepo.findRoleByUserIdAndTeamId({
        userId,
        teamId: rawEventType.team.id,
      })
    : null;

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
  const organizationRepo = getOrganizationRepository();
  const isUserInPlatformOrganization = currentOrganizationId
    ? !!(await organizationRepo.findById({ id: currentOrganizationId }))?.isPlatform
    : false;

  if (isUserOrganizationAdmin && currentOrganizationId && isUserInPlatformOrganization) {
    // Platform Organization Admin can access any event of the organization even without being a member of the sub-teams
    return await eventTypeRepo.findByIdForOrgAdmin({
      id: eventTypeId,
      organizationId: currentOrganizationId,
    });
  }

  // Regular(Non Platform) Organization member(admin/non-admin) can access any event-type they are are a member of including sub-team events and Regular Team(non-subteam) events.
  // Remember an organization member can stay a part of Regular Team still if  that team hasn't been moved to the organization yet.
  return await eventTypeRepo.findById({
    id: eventTypeId,
    userId,
  });
}

export const getEventTypeByIdWithTeamMembers = async (props: getEventTypeByIdProps) => {
  const result = await getEventTypeById(props);

  const { prisma } = props;
  const userRepo = new UserRepository(prisma);
  const membershipRepo = new MembershipRepository(prisma);

  const isOrgEventType = !!result.team?.parentId;

  const memberships = result.team
    ? await membershipRepo.findMembershipsWithUserByTeamId({ teamId: result.team.id })
    : [];

  const enrichedMembers = await Promise.all(
    memberships.map(async (membership) => ({
      ...membership,
      user: await userRepo.enrichUserWithItsProfile({
        user: membership.user,
      }),
    }))
  );

  const teamMembers = enrichedMembers
    .filter((member) => member.accepted || isOrgEventType)
    .map((member) => {
      const user: typeof member.user & { avatar: string } = {
        ...member.user,
        avatar: getUserAvatarUrl(member.user),
      };
      return {
        ...user,
        profileId: user.profile.id,
        eventTypes: user.eventTypes.map((evTy) => evTy.slug),
        membership: member.role,
      };
    });

  return { ...result, teamMembers };
};

export default getEventTypeById;
