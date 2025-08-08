import type { UseFormReturn } from "react-hook-form";

import type { WorkflowRepository } from "@calcom/lib/server/repository/workflow";
import type { TimeFormat } from "@calcom/lib/timeFormat";
import type { PrismaClient } from "@calcom/prisma";
import type {
  EventType,
  Prisma,
  User,
  WorkflowReminder,
  WorkflowTemplates,
  Membership,
} from "@calcom/prisma/client";
import type { TimeUnit, WorkflowActions, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import type { CalEventResponses, RecurringEvent } from "@calcom/types/Calendar";

type Workflow = {
  id: number;
  name: string;
  trigger: WorkflowTriggerEvents;
  time: number | null;
  timeUnit: TimeUnit | null;
  userId: number | null;
  teamId: number | null;
  steps: WorkflowStep[];
};

type WorkflowStep = {
  workflowId: number;
  action: WorkflowActions;
  sendTo: string | null;
  template: WorkflowTemplates;
  reminderBody: string | null;
  emailSubject: string | null;
  id: number;
  sender: string | null;
  includeCalendarEvent: boolean;
  numberVerificationPending: boolean;
  numberRequired: boolean | null;
  stepNumber: number;
  // disableOnMarkNoShow: boolean | null;
};

// Core types for workflow management
interface WorkflowPageProps {
  workflowData?: Awaited<ReturnType<typeof WorkflowRepository.getById>>;
  verifiedNumbers?: Awaited<ReturnType<typeof WorkflowRepository.getVerifiedNumbers>>;
  verifiedEmails?: Awaited<ReturnType<typeof WorkflowRepository.getVerifiedEmails>>;
}

interface WorkflowFormValues {
  name: string;
  activeOn: Array<{
    value: string;
    label: string;
  }>;
  steps: Array<WorkflowStep & { senderName: string | null }>;
  trigger: WorkflowTriggerEvents;
  time?: number;
  timeUnit?: TimeUnit;
  selectAll: boolean;
}

interface WorkflowActionOption {
  label: string;
  value: WorkflowActions;
  needsTeamsUpgrade: boolean;
}

interface WorkflowStepComponentProps {
  step: WorkflowStep;
  index: number;
  form: UseFormReturn<WorkflowFormValues>;
  teamId?: number;
  readOnly: boolean;
  actionOptions?: WorkflowActionOption[];
  userTimeFormat?: number;
  onRemove?: (id: number) => void;
}

// Legacy interface - kept for compatibility
interface ActionModule {
  id: number;
  sendVia: string;
  message: string;
  messageTemplate: string;
}

type PartialWorkflowStep =
  | (Partial<WorkflowStep> & { workflow: { userId?: number; teamId?: number } })
  | null;

type Booking = Prisma.BookingGetPayload<{
  include: {
    attendees: true;
  };
}>;

type PartialBooking =
  | (Pick<
      Booking,
      | "startTime"
      | "endTime"
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
    } & {
      user: Partial<User> | null;
    })
  | null;

export type PartialWorkflowReminder = Pick<
  WorkflowReminder,
  "id" | "isMandatoryReminder" | "scheduledDate"
> & {
  booking: PartialBooking | null;
  // attendee: Attendee | null;
} & { workflowStep: PartialWorkflowStep };

const BATCH_PROCESSING_SIZE = 90;
interface ScheduleReminderArgs {
  evt: BookingInfo;
  triggerEvent: WorkflowTriggerEvents;
  timeSpan: {
    time: number | null;
    timeUnit: TimeUnit | null;
  };
  template?: WorkflowTemplates;
  sender?: string | null;
  workflowStepId?: number;
  seatReferenceUid?: string;
  attendeeId?: number;
}
type WorkflowType = Workflow & {
  team: {
    id: number;
    name: string;
    members: Membership[];
    slug: string | null;
    logo?: string | null;
  } | null;
  steps: WorkflowStep[];
  activeOnTeams?: {
    team: {
      id: number;
      name?: string | null;
    };
  }[];
  activeOn?: {
    eventType: {
      id: number;
      title: string;
      parentId: number | null;
      _count: {
        children: number;
      };
    };
  }[];
  readOnly?: boolean;
  isOrg?: boolean;
  isActiveOnAll?: boolean;
  disabled?: boolean;
};

type ScheduleEmailReminderAction = Extract<
  WorkflowActions,
  "EMAIL_HOST" | "EMAIL_ATTENDEE" | "EMAIL_ADDRESS"
>;

type AttendeeInBookingInfo = {
  id?: number;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string | null;
  timeZone: string;
  language: { locale: string };
};

type BookingInfo = {
  uid?: string | null;
  bookerUrl: string;
  attendees: AttendeeInBookingInfo[];
  organizer: {
    language: { locale: string };
    name: string;
    email: string;
    timeZone: string;
    timeFormat?: TimeFormat;
    username?: string;
  };
  eventTypeId?: number | null;
  eventType: {
    title?: string;
    slug?: string;
    recurringEvent?: RecurringEvent | null;
    id?: number;
  };
  startTime: string;
  endTime: string;
  title: string;
  location?: string | null;
  additionalNotes?: string | null;
  responses?: CalEventResponses | null;
  metadata?: Prisma.JsonValue;
};

interface ScheduleReminderArgs {
  evt: BookingInfo;
  triggerEvent: WorkflowTriggerEvents;
  timeSpan: {
    time: number | null;
    timeUnit: TimeUnit | null;
  };
  template?: WorkflowTemplates;
  sender?: string | null;
  workflowStepId?: number;
  seatReferenceUid?: string;
  attendeeId?: number;
}
type ScheduleTextReminderAction = Extract<
  WorkflowActions,
  "SMS_ATTENDEE" | "SMS_NUMBER" | "WHATSAPP_ATTENDEE" | "WHATSAPP_NUMBER"
>;
export interface ScheduleTextReminderArgs extends ScheduleReminderArgs {
  reminderPhone: string | null;
  message: string;
  action: ScheduleTextReminderAction;
  userId?: number | null;
  teamId?: number | null;
  isVerificationPending?: boolean;
  prisma?: PrismaClient;
}
export type {
  Workflow,
  WorkflowType,
  WorkflowStep,
  WorkflowPageProps,
  WorkflowFormValues,
  WorkflowActionOption,
  WorkflowStepComponentProps,
  ActionModule,
  ScheduleEmailReminderAction,
  ScheduleReminderArgs,
  BookingInfo,
  AttendeeInBookingInfo,
  ScheduleTextReminderAction,
};

export interface WorkflowCardProps {
  workflow: WorkflowType;
  onEdit: (workflowId: number) => void;
  onToggle: (workflowId: number, enabled: boolean) => void;
  onDuplicate: (workflowId: number) => void;
  onDelete: (workflowId: number) => void;
  onCopyLink: (workflowId: number) => void;
  copiedLink: number | null;
}

export interface TeamProfile {
  readOnly?: boolean;
  slug: string | null;
  name: string | null;
  teamId: number | null;
  image?: string | null;
}

export interface TeamFiltersState {
  userId: number | null;
  teamIds: number[];
}

export interface WorkflowsProps {
  setHeaderMeta?: (meta: any) => void;
  filteredList?: any;
}
