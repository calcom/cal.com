import type { Prisma } from "@prisma/client";

import { DailyLocationType } from "@calcom/app-store/locations";
import slugify from "@calcom/lib/slugify";
import { PeriodType, SchedulingType } from "@calcom/prisma/enums";
import type { userSelect } from "@calcom/prisma/selects";
import type { CustomInputSchema } from "@calcom/prisma/zod-utils";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { CredentialPayload } from "@calcom/types/Credential";

type User = Prisma.UserGetPayload<typeof userSelect>;

type UsernameSlugLinkProps = {
  users: {
    id?: number;
    username: string | null;
    email?: string;
    name?: string | null;
    bio?: string | null;
    avatar?: string | null;
    theme?: string | null;
    away?: boolean;
    verified?: boolean | null;
    allowDynamicBooking?: boolean | null;
  }[];
  slug: string;
};

const user: User & { credentials: CredentialPayload[] } = {
  metadata: null,
  theme: null,
  credentials: [],
  username: "john.doe",
  timeZone: "",
  bufferTime: 0,
  availability: [],
  id: 0,
  startTime: 0,
  endTime: 0,
  selectedCalendars: [],
  schedules: [],
  defaultScheduleId: null,
  locale: "en",
  email: "john.doe@example.com",
  name: "John doe",
  destinationCalendar: null,
  hideBranding: true,
  brandColor: "#797979",
  darkBrandColor: "#efefef",
  allowDynamicBooking: true,
  timeFormat: 12,
  travelSchedules: [],
};

const customInputs: CustomInputSchema[] = [];

const commons = {
  isDynamic: true,
  periodCountCalendarDays: true,
  periodStartDate: null,
  periodEndDate: null,
  beforeEventBuffer: 0,
  afterEventBuffer: 0,
  periodType: PeriodType.UNLIMITED,
  periodDays: null,
  slotInterval: null,
  offsetStart: 0,
  locations: [{ type: DailyLocationType }],
  customInputs,
  disableGuests: true,
  minimumBookingNotice: 120,
  schedule: null,
  timeZone: null,
  successRedirectUrl: "",
  forwardParamsSuccessRedirect: true,
  teamId: null,
  scheduleId: null,
  availability: [],
  price: 0,
  currency: "usd",
  schedulingType: SchedulingType.COLLECTIVE,
  seatsPerTimeSlot: null,
  seatsShowAttendees: null,
  seatsShowAvailabilityCount: null,
  onlyShowFirstAvailableSlot: false,
  id: 0,
  hideCalendarNotes: false,
  hideCalendarEventDetails: false,
  recurringEvent: null,
  destinationCalendar: null,
  team: null,
  lockTimeZoneToggleOnBookingPage: false,
  requiresConfirmation: false,
  requiresBookerEmailVerification: false,
  bookingLimits: null,
  durationLimits: null,
  hidden: false,
  userId: 0,
  parentId: null,
  parent: null,
  owner: null,
  workflows: [],
  users: [user],
  hosts: [],
  metadata: EventTypeMetaDataSchema.parse({}),
  bookingFields: [],
  assignAllTeamMembers: false,
  assignRRMembersUsingSegment: false,
  rrSegmentQueryValue: null,
  isRRWeightsEnabled: false,
  rescheduleWithSameRoundRobinHost: false,
  useEventTypeDestinationCalendarEmail: false,
  secondaryEmailId: null,
  secondaryEmail: null,
  autoTranslateDescriptionEnabled: false,
  fieldTranslations: [],
  maxLeadThreshold: null,
};

export const dynamicEvent = {
  length: 30,
  slug: "dynamic",
  title: "Group Meeting",
  eventName: "Group Meeting",
  description: "Join us for a meeting with multiple people",
  descriptionAsSafeHTML: "",
  position: 0,
  ...commons,
  metadata: EventTypeMetaDataSchema.parse({ multipleDuration: [15, 30, 45, 60, 90] }),
};

export const defaultEvents = [dynamicEvent];

export const getDynamicEventDescription = (dynamicUsernames: string[], slug: string): string => {
  return `Book a ${slug} min event with ${dynamicUsernames.join(", ")}`;
};

export const getDynamicEventName = (dynamicNames: string[], slug: string): string => {
  const lastUser = dynamicNames.pop();
  return `Dynamic Collective ${slug} min event with ${dynamicNames.join(", ")} & ${lastUser}`;
};

export const getDefaultEvent = (slug: string) => {
  const event = defaultEvents.find((obj) => {
    return obj.slug === slug;
  });
  return event || dynamicEvent;
};

export const getGroupName = (usernameList: string[]): string => {
  return usernameList.join(", ");
};

export const getUsernameSlugLink = ({ users, slug }: UsernameSlugLinkProps): string => {
  let slugLink = ``;
  if (users.length > 1) {
    const combinedUsername = users.map((user) => user.username).join("+");
    slugLink = `/${combinedUsername}/${slug}`;
  } else {
    slugLink = `/${users[0].username}/${slug}`;
  }
  return slugLink;
};

const arrayCast = (value: unknown | unknown[]) => {
  return Array.isArray(value) ? value : value ? [value] : [];
};

export const getUsernameList = (users: string | string[] | undefined): string[] => {
  // Multiple users can come in case of a team round-robin booking and in that case dynamic link won't be a user.
  // So, even though this code handles even if individual user is dynamic link, that isn't a possibility right now.
  users = arrayCast(users);

  const allUsers = users.map((user) => user.replace(/( |%20|%2b)/g, "+").split("+")).flat();
  return Array.prototype.concat(...allUsers.map((userSlug) => slugify(userSlug)));
};

export default defaultEvents;

export type DefaultEvent = Awaited<ReturnType<typeof getDefaultEvent>>;
