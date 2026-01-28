import type { Retell } from "retell-sdk";

import type { FORM_SUBMITTED_WEBHOOK_RESPONSES } from "@calcom/app-store/routing-forms/lib/formSubmissionUtils";
import type { WorkflowPermissions } from "@calcom/features/workflows/repositories/WorkflowPermissionsRepository";
import type { TimeFormat } from "@calcom/lib/timeFormat";
import type {
  Prisma,
  Membership,
  Workflow as PrismaWorkflow,
  WorkflowStep as PrismaWorkflowStep,
} from "@calcom/prisma/client";
import type { TimeUnit, WorkflowTemplates, WorkflowTriggerEvents } from "@calcom/prisma/enums";
import { WorkflowActions } from "@calcom/prisma/enums";
import type { CalEventResponses, RecurringEvent } from "@calcom/types/Calendar";
import type { MultiSelectCheckboxesOptionType as Option } from "@calcom/ui/components/form";

export type Workflow = {
  id: number;
  name: string;
  trigger: WorkflowTriggerEvents;
  time: number | null;
  timeUnit: TimeUnit | null;
  userId: number | null;
  teamId: number | null;
  steps: WorkflowStep[];
};

export type WorkflowStep = {
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
  verifiedAt?: Date | null;
};

export type FormSubmissionData = {
  responses: FORM_SUBMITTED_WEBHOOK_RESPONSES;
  routedEventTypeId: number | null;
  user: {
    email: string;
    timeFormat: number | null;
    locale: string;
  };
};

export type AttendeeInBookingInfo = {
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string | null;
  timeZone: string;
  language: { locale: string };
};

export type BookingInfo = {
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
  eventType?: {
    slug: string;
    recurringEvent?: RecurringEvent | null;
    customReplyToEmail?: string | null;
  };
  startTime: string;
  endTime: string;
  title: string;
  location?: string | null;
  additionalNotes?: string | null;
  responses?: CalEventResponses | null;
  metadata?: Prisma.JsonValue;
  cancellationReason?: string | null;
  rescheduleReason?: string | null;
  hideOrganizerEmail?: boolean;
  videoCallData?: {
    url?: string;
  };
};

export type WorkflowContextData =
  | { evt: BookingInfo; formData?: never }
  | {
      evt?: never;
      formData: FormSubmissionData;
    };

export type ScheduleEmailReminderAction = Extract<
  WorkflowActions,
  "EMAIL_HOST" | "EMAIL_ATTENDEE" | "EMAIL_ADDRESS"
>;

export type WorkflowListType = PrismaWorkflow & {
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
    };
  }[];
  readOnly?: boolean;
  permissions?: WorkflowPermissions;
  isOrg?: boolean;
};

export type FormValues = {
  name: string;
  activeOn: Option[];
  steps: (PrismaWorkflowStep & {
    senderName: string | null;
    agentId?: string | null;
    inboundAgentId?: string | null;
  })[];
  trigger: WorkflowTriggerEvents;
  time?: number;
  timeUnit?: TimeUnit;
  selectAll: boolean;
};

export type CallData = Retell.WebCallResponse | Retell.PhoneCallResponse;

export type CallDetailsPayload = {
  showModal: boolean;
  selectedCall?: CallData;
};

export type CallDetailsState = {
  callDetailsSheet: CallDetailsPayload;
};

export type CallDetailsAction =
  | {
      type: "OPEN_CALL_DETAILS";
      payload: CallDetailsPayload;
    }
  | {
      type: "CLOSE_MODAL";
    };
