import { PeriodType, SchedulingType, UserPlan, EventTypeCustomInput } from "@prisma/client";

import { LocationType } from "@calcom/lib/location";

const availability = [
  {
    days: [1, 2, 3, 4, 5],
    startTime: new Date().getTime(),
    endTime: new Date().getTime(),
    date: new Date(),
    scheduleId: null,
  },
];

const customInputs: EventTypeCustomInput[] = [];

const commons = {
  periodCountCalendarDays: true,
  periodStartDate: new Date(),
  periodEndDate: new Date(),
  beforeEventBuffer: 0,
  afterEventBuffer: 0,
  periodType: PeriodType.UNLIMITED,
  periodDays: null,
  slotInterval: null,
  locations: [LocationType.Daily],
  customInputs,
  disableGuests: false,
  minimumBookingNotice: 120,
  schedule: null,
  timeZone: null,
  availability: [],
  price: 0,
  currency: "usd",
  schedulingType: SchedulingType.COLLECTIVE,
  id: 0,
  metadata: {},
  hideCalendarNotes: false,
  destinationCalendar: false,
  team: null,
  requiresConfirmation: false,
  description: "",
  hidden: false,
  userId: 0,
  users: [
    {
      plan: UserPlan.PRO,
      name: "test",
      username: "test",
      avatar: "",
      hideBranding: true,
      timeZone: "",
    },
  ],
};

const min15Event = {
  length: 15,
  slug: "15min",
  title: "15min",
  eventName: "Dynamic Collective 15min Event",
  ...commons,
};
const min30Event = {
  length: 30,
  slug: "30min",
  title: "30min",
  eventName: "Dynamic Collective 30min Event",
  ...commons,
};
const min60Event = {
  length: 60,
  slug: "60min",
  title: "60min",
  eventName: "Dynamic Collective 60min Event",
  ...commons,
};

const defaultEvents = [min15Event, min30Event, min60Event];

export const getDefaultEvent = (slug: string) => {
  const event = defaultEvents.find((obj) => {
    return obj.slug === slug;
  });
  return event || min15Event;
};

export const getGroupName = (usernameList: string[]): string => {
  return usernameList.toString();
};

export const getUsernameSlugLink = ({ users, slug }): string => {
  let slugLink = ``;
  if (users.length > 1) {
    let combinedUsername = ``;
    for (let i = 0; i < users.length - 1; i++) {
      combinedUsername = `${users[i].username}+`;
    }
    combinedUsername = `${combinedUsername}${users[users.length - 1].username}`;
    slugLink = `/${combinedUsername}/${slug}`;
  } else {
    slugLink = `/${users[0].username}/${slug}`;
  }
  return slugLink;
};

export default defaultEvents;
