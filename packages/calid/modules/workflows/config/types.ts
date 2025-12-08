// -------------------- Imports --------------------
import type { UseFormReturn } from "react-hook-form";

import type { WorkflowRepository } from "@calcom/lib/server/repository/workflow";
import type { TimeFormat } from "@calcom/lib/timeFormat";
import type {
  PrismaClient,
  Prisma,
  EventType,
  User,
  CalIdWorkflowReminder,
  WorkflowTemplates,
  CalIdMembership,
} from "@calcom/prisma/client";
import type { TimeUnit, WorkflowActions, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import type { CalEventResponses, RecurringEvent } from "@calcom/types/Calendar";

// -------------------- Workflow Core --------------------
export type CalIdWorkflow = {
  id: number;
  name: string;
  trigger: WorkflowTriggerEvents;
  time: number | null;
  timeUnit: TimeUnit | null;
  userId: number | null;
  calIdTeamId: number | null;
  steps: CalIdWorkflowStep[];
};

export type CalIdWorkflowStep = {
  id: number;
  workflowId: number;
  action: WorkflowActions;
  template: WorkflowTemplates;
  stepNumber: number;

  // Optional fields
  sendTo: string | null;
  reminderBody: string | null;
  emailSubject: string | null;
  sender: string | null;
  includeCalendarEvent: boolean;
  numberVerificationPending: boolean;
  numberRequired: boolean | null;

  metaTemplateName: string | null;
  metaTemplatePhoneNumberId: string | null;
};

// Workflow with relations
export type CalIdWorkflowType = CalIdWorkflow & {
  calIdTeam: {
    id: number;
    name: string;
    members: CalIdMembership[];
    slug: string | null;
    logoUrl?: string | null;
  } | null;
  steps: CalIdWorkflowStep[];
  activeOnTeams?: {
    calIdTeam: { id: number; name?: string | null };
  }[];
  activeOn?: {
    eventType: {
      id: number;
      title: string;
      parentId: number | null;
      _count: { children: number };
    };
  }[];
  readOnly?: boolean;
  isActiveOnAll?: boolean;
  disabled?: boolean;
};

// -------------------- Workflow UI --------------------
export interface CalIdWorkflowPageProps {
  workflowData?: Awaited<ReturnType<typeof WorkflowRepository.getById>>;
  verifiedNumbers?: Awaited<ReturnType<typeof WorkflowRepository.getVerifiedNumbers>>;
  verifiedEmails?: Awaited<ReturnType<typeof WorkflowRepository.getVerifiedEmails>>;
}

export interface CalIdWorkflowFormValues {
  name: string;
  activeOn: Array<{ value: string; label: string }>;
  steps: Array<CalIdWorkflowStep & { senderName: string | null }>;
  trigger: WorkflowTriggerEvents;
  time?: number;
  timeUnit?: TimeUnit;
  selectAll: boolean;
}

export interface CalIdWorkflowActionOption {
  label: string;
  value: WorkflowActions;
  needsTeamsUpgrade: boolean;
}

export interface CalIdWorkflowStepComponentProps {
  step: CalIdWorkflowStep;
  index: number;
  form: UseFormReturn<CalIdWorkflowFormValues>;
  calIdTeamId?: number;
  readOnly: boolean;
  actionOptions?: CalIdWorkflowActionOption[];
  userTimeFormat?: number;
  onRemove?: (id: number) => void;
}

export interface CalIdWorkflowCardProps {
  workflow: CalIdWorkflowType;
  onEdit: (workflowId: number) => void;
  onToggle: (workflowId: number, enabled: boolean) => void;
  onDuplicate: (workflowId: number) => void;
  onDelete: (workflowId: number) => void;
  onCopyLink: (workflowId: number) => void;
  copiedLink: number | null;
}

export interface CalIdWorkflowsProps {
  setHeaderMeta?: (meta: any) => void;
  filteredList?: any;
}

// -------------------- Booking Related --------------------
export type Booking = Prisma.BookingGetPayload<{ include: { attendees: true } }>;

export type PartialBooking =
  | (Pick<
      Booking,
      | "startTime"
      | ""
      | "location"
      | "description"
      | "metadata"
      | "customInputs"
      | "responses"
      | "uid"
      | "attendees"
      | "userPrimaryEmail"
      | "smsReminderNumber"
      | "title"
      | "eventTypeId"
    > & {
      eventType:
        | (Partial<EventType> & {
            slug: string;
            team: { parentId?: number };
            hosts: { user: { email: string; destinationCalendar?: { primaryEmail: string } } }[] | undefined;
          })
        | null;
      user: Partial<User> | null;
    })
  | null;

export type PartialCalIdWorkflowStep =
  | (Partial<CalIdWorkflowStep> & { workflow: { userId?: number; calIdTeamId?: number } })
  | null;

export type PartialCalIdWorkflowReminder = Pick<
  CalIdWorkflowReminder,
  "id" | "isMandatoryReminder" | "scheduledDate"
> & {
  booking: PartialBooking | null;
  workflowStep: PartialCalIdWorkflowStep;
};

// -------------------- Scheduling --------------------
export interface CalIdScheduleReminderArgs {
  evt: CalIdBookingInfo;
  triggerEvent: WorkflowTriggerEvents;
  timeSpan: { time: number | null; timeUnit: TimeUnit | null };
  template?: WorkflowTemplates | null;
  sender?: string | null;
  workflowStepId?: number;
  seatReferenceUid?: string;
  attendeeId?: number;
}

export type CalIdScheduleEmailReminderAction = Extract<
  WorkflowActions,
  "EMAIL_HOST" | "EMAIL_ATTENDEE" | "EMAIL_ADDRESS"
>;

export type CalIdScheduleWhatsAppReminderAction = Extract<
  WorkflowActions,
  "WHATSAPP_ATTENDEE" | "WHATSAPP_NUMBER"
>;


export type CalIdScheduleTextReminderAction = Extract<
  WorkflowActions,
  "SMS_ATTENDEE" | "SMS_NUMBER" | "WHATSAPP_ATTENDEE" | "WHATSAPP_NUMBER"
>;

export interface CalIdScheduleTextReminderArgs extends CalIdScheduleReminderArgs {
  reminderPhone: string | null;
  message: string;
  action: CalIdScheduleTextReminderAction;
  userId?: number | null;
  calIdTeamId?: number | null;
  isVerificationPending?: boolean;
  prisma?: PrismaClient;
  metaTemplateName?: string | null;
  metaPhoneNumberId?: string | null;
}

export interface CalIdScheduleWhatsAppReminderArgs extends CalIdScheduleReminderArgs {
  workflow: CalIdWorkflow,
  reminderPhone: string;
  message: string;
  action: CalIdScheduleWhatsAppReminderAction;
  userId?: number | null;
  calIdTeamId?: number | null;
  isVerificationPending?: boolean;
  prisma?: PrismaClient;
  metaTemplateName?: string | null;
  metaPhoneNumberId?: string | null;
}

// -------------------- Booking Info --------------------
export type CalIdAttendeeInBookingInfo = {
  id?: number;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string | null;
  timeZone: string;
  language: { locale: string };
};

export type CalIdBookingInfo = {
  uid?: string | null;
  bookerUrl: string;
  attendees: CalIdAttendeeInBookingInfo[];
  organizer: {
    name: string;
    email: string;
    timeZone: string;
    language: { locale: string };
    timeFormat?: TimeFormat;
    username?: string;
  };
  eventTypeId?: number | null;
  eventType: {
    id?: number;
    title?: string;
    slug?: string;
    recurringEvent?: RecurringEvent | null;
  };
  startTime: string;
  endTime: string;
  title: string;
  location?: string | null;
  additionalNotes?: string | null;
  responses?: CalEventResponses | null;
  metadata?: Prisma.JsonValue;
};

// -------------------- Teams --------------------
export interface CalIdTeamProfile {
  readOnly?: boolean;
  slug: string | null;
  name: string;
  id: number | null;
  logoUrl?: string | null;
}

export interface CalIdTeamFiltersState {
  userId: number | null;
  calIdTeamIds: number[];
}

// -------------------- Constants --------------------
export const BATCH_PROCESSING_SIZE = 90;

// -------------------- Legacy --------------------
/** Legacy interface - kept for compatibility */
export interface CalIdActionModule {
  id: number;
  sendVia: string;
  message: string;
  messageTemplate: string;
}
