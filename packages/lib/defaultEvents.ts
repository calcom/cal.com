import type { Prisma } from "@prisma/client";
import { PeriodType, SchedulingType } from "@prisma/client";

import { DailyLocationType } from "@calcom/app-store/locations";
import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import type { userSelect } from "@calcom/prisma/selects";
import type { CustomInputSchema } from "@calcom/prisma/zod-utils";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

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

const user: User = {
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
  avatar: "",
  destinationCalendar: null,
  hideBranding: true,
  brandColor: "#797979",
  darkBrandColor: "#efefef",
  allowDynamicBooking: true,
  timeFormat: 12,
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
  locations: [{ type: DailyLocationType }],
  customInputs,
  disableGuests: true,
  minimumBookingNotice: 120,
  schedule: null,
  timeZone: null,
  successRedirectUrl: "",
  teamId: null,
  scheduleId: null,
  availability: [],
  price: 0,
  currency: "usd",
  schedulingType: SchedulingType.COLLECTIVE,
  seatsPerTimeSlot: null,
  seatsShowAttendees: null,
  id: 0,
  hideCalendarNotes: false,
  recurringEvent: null,
  destinationCalendar: null,
  team: null,
  requiresConfirmation: false,
  bookingLimits: null,
  durationLimits: null,
  hidden: false,
  userId: 0,
  owner: null,
  workflows: [],
  users: [user],
  hosts: [],
  metadata: EventTypeMetaDataSchema.parse({}),
  bookingFields: getBookingFieldsWithSystemFields({
    bookingFields: [],
    customInputs: [],
    // Default value of disableGuests from DB.
    disableGuests: false,
    metadata: {},
    workflows: [],
  }),
};

const min15Event = {
  length: 15,
  slug: "15",
  title: "15min",
  eventName: "Dynamic Collective 15min Event",
  description: "Dynamic Collective 15min Event",
  descriptionAsSafeHTML: "Dynamic Collective 15min Event",
  position: 0,
  ...commons,
};
const min30Event = {
  length: 30,
  slug: "30",
  title: "30min",
  eventName: "Dynamic Collective 30min Event",
  description: "Dynamic Collective 30min Event",
  descriptionAsSafeHTML: "Dynamic Collective 30min Event",
  position: 1,
  ...commons,
};
const min60Event = {
  length: 60,
  slug: "60",
  title: "60min",
  eventName: "Dynamic Collective 60min Event",
  description: "Dynamic Collective 60min Event",
  descriptionAsSafeHTML: "Dynamic Collective 60min Event",
  position: 2,
  ...commons,
};

const defaultEvents = [min15Event, min30Event, min60Event];

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
  return event || min15Event;
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

  const allUsers = users.map((user) =>
    user
      .toLowerCase()
      .replace(/( |%20)/g, "+")
      .split("+")
  );

  return Array.prototype.concat(...allUsers);
};

export default defaultEvents;
