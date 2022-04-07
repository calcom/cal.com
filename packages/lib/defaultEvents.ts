import { PeriodType, SchedulingType, UserPlan, EventTypeCustomInput } from "@prisma/client";

const availability = [
  {
    days: [1, 2, 3, 4, 5],
    startTime: new Date().getTime(),
    endTime: new Date().getTime(),
    date: new Date(),
    scheduleId: null,
  },
];

type UsernameSlugLinkProps = {
  users: {
    id?: number;
    username: string | null;
    email?: string;
    name?: string | null;
    bio?: string | null;
    avatar?: string | null;
    theme?: string | null;
    plan?: UserPlan;
    away?: boolean;
    verified?: boolean | null;
    allowDynamicBooking?: boolean | null;
  }[];
  slug: string;
};

const customInputs: EventTypeCustomInput[] = [];

const commons = {
  periodCountCalendarDays: true,
  periodStartDate: null,
  periodEndDate: null,
  beforeEventBuffer: 0,
  afterEventBuffer: 0,
  periodType: PeriodType.UNLIMITED,
  periodDays: null,
  slotInterval: null,
  locations: [{ type: "integrations:daily" }],
  customInputs,
  disableGuests: true,
  minimumBookingNotice: 120,
  schedule: null,
  timeZone: null,
  successRedirectUrl: "",
  availability: [],
  price: 0,
  currency: "usd",
  schedulingType: SchedulingType.COLLECTIVE,
  id: 0,
  metadata: {
    smartContractAddress: "",
  },
  isWeb3Active: false,
  hideCalendarNotes: false,
  destinationCalendar: null,
  team: null,
  requiresConfirmation: false,
  hidden: false,
  userId: 0,
  users: [
    {
      id: 0,
      plan: UserPlan.PRO,
      email: "jdoe@example.com",
      name: "John Doe",
      username: "jdoe",
      avatar: "",
      hideBranding: true,
      timeZone: "",
      destinationCalendar: null,
      credentials: [],
      bufferTime: 0,
      locale: "en",
      theme: null,
      brandColor: "#292929",
      darkBrandColor: "#fafafa",
    },
  ],
};

const min15Event = {
  length: 15,
  slug: "15min",
  title: "15min",
  eventName: "Dynamic Collective 15min Event",
  description: "Dynamic Collective 15min Event",
  ...commons,
};
const min30Event = {
  length: 30,
  slug: "30min",
  title: "30min",
  eventName: "Dynamic Collective 30min Event",
  description: "Dynamic Collective 30min Event",
  ...commons,
};
const min60Event = {
  length: 60,
  slug: "60min",
  title: "60min",
  eventName: "Dynamic Collective 60min Event",
  description: "Dynamic Collective 60min Event",
  ...commons,
};

const defaultEvents = [min15Event, min30Event, min60Event];

export const getDynamicEventDescription = (dynamicUsernames: string[], slug: string): string => {
  return `Book a ${slug} event with ${dynamicUsernames.join(", ")}`;
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

export const getUsernameList = (users: string): string[] => {
  // For Team booking, users might be undefined
  return users
    ?.toLowerCase()
    .replace(" ", "+")
    .replace("%20", "+")
    .split("+")
    .filter((el) => {
      return el.length != 0;
    });
};

export default defaultEvents;
