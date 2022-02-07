import { Availability, EventTypeCustomInput, PeriodType, SchedulingType } from "@prisma/client";

import { LocationType } from "@lib/location";

export interface OptionTypeBase {
  label: string;
  value: LocationType;
  disabled?: boolean;
}

export interface FormData {
  title: string;
  eventTitle: string;
  smartContractAddress: string;
  eventName: string;
  slug: string;
  length: number;
  description: string;
  disableGuests: boolean;
  requiresConfirmation: boolean;
  schedulingType: SchedulingType | null;
  price: number;
  hidden: boolean;
  locations: { type: LocationType; address?: string }[];
  customInputs: EventTypeCustomInput[];
  users: string[];
  availability: { openingHours: AvailabilityInput[]; dateOverrides: AvailabilityInput[] };
  timeZone: string;
  periodType: PeriodType;
  periodDays: number;
  periodCountCalendarDays: "1" | "0";
  periodDates: { startDate: Date; endDate: Date };
  minimumBookingNotice: number;
  slotInterval: number | null;
  destinationCalendar: {
    integration: string;
    externalId: string;
  };
}

export interface Token {
  name?: string;
  address: string;
  symbol: string;
}

export interface NFT extends Token {
  // Some OpenSea NFTs have several contracts
  contracts: Array<Token>;
}

export type AvailabilityInput = Pick<Availability, "days" | "startTime" | "endTime">;
