import { z } from "zod";

const CreateEventTypesSchema = z.object({
  length: z.number().min(1),
  slug: z.string(),
  title: z.string(),
});

const GetEventTypeByIdSchema = z.object({
  id: z.string(),
  forAtom: z.boolean().optional(),
});

export type CreateEventTypeArgs = z.infer<typeof CreateEventTypesSchema>;
export type GetEventTypeByIdArgs = z.infer<typeof GetEventTypeByIdSchema>;

export type EventType = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  position: number;
  locations: string[] | null;
  length: number;
  offsetStart: number;
  hidden: boolean;
  userId: number;
  profileId: number | null;
  teamId: number | null;
  eventName: string | null;
  parentId: number | null;
  bookingFields: unknown | null;
  timeZone: string | null;
  periodType: "UNLIMITED" | "ROLLING" | "RANGE";
  periodStartDate: string | null;
  periodEndDate: string | null;
  periodDays: number | null;
  periodCountCalendarDays: boolean | null;
  lockTimeZoneToggleOnBookingPage: boolean;
  requiresConfirmation: boolean;
  requiresBookerEmailVerification: boolean;
  recurringEvent?: boolean;
  disableGuests: boolean;
  hideCalendarNotes: boolean;
  minimumBookingNotice: number;
  beforeEventBuffer: number;
  afterEventBuffer: number;
  seatsPerTimeSlot: number | null;
  onlyShowFirstAvailableSlot: boolean;
  seatsShowAttendees: boolean;
  seatsShowAvailabilityCount: boolean;
  schedulingType: unknown | null;
  scheduleId: number | null;
  price: number;
  currency: "usd";
  slotInterval: number | null;
  metadata: Record<string, unknown> | null;
  successRedirectUrl: string | null;
  bookingLimits: number | null;
  durationLimits: number | null;
  isInstantEvent: boolean;
  assignAllTeamMembers: boolean;
  useEventTypeDestinationCalendarEmail: boolean;
};
