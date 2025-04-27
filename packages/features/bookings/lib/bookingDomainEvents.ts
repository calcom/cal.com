import { type DomainEvent } from "@calcom/lib/domainEvent/domainEvent";
import { type SchedulingType } from "@calcom/prisma/enums";
import { type EventTypeMetadata } from "@calcom/prisma/zod-utils";
import { type CalendarEvent } from "@calcom/types/Calendar";

export interface EventType {
  id: number;
  teamId: number | null;
  parentId: number | null;

  slug: string;
  schedulingType: SchedulingType | null;
  hosts: Array<{ user: { email: string; destinationCalendar?: { primaryEmail: string | null } | null } }>;
  owner: { hideBranding: boolean } | null;

  metadata: EventTypeMetadata;
}

export interface Booking {
  id: number;
  user: { id: number };
  eventType: EventType;
  calendarEvent: CalendarEvent;

  bookerUrl: string;
  videoCallUrl?: string | null;
  smsReminderNumber?: string | null;
  rescheduleUid?: string | null;
  rescheduleReason?: string | null;
  isRecurring?: boolean;
  isFirstRecurringEvent?: boolean;

  requiresConfirmation: boolean;
  isNotConfirmed: boolean;

  isDryRun?: boolean;
}

/**
 * Domain event emitted when a regular booking is created.
 */
export class BookingCreated implements DomainEvent {
  constructor(
    public readonly booking: Booking & {
      noEmail?: boolean;
      platformClientId?: string;
    }
  ) {}
}
