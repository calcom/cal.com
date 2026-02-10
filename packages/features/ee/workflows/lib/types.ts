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
import { z } from "zod";
import { TIME_UNIT, WORKFLOW_ACTIONS, WORKFLOW_TEMPLATES, WORKFLOW_TRIGGER_EVENTS } from "./constants";

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

export const ZWorkflow: z.ZodType<Workflow> = z.object({
  id: z.number(),
  name: z.string(),
  trigger: z.enum(WORKFLOW_TRIGGER_EVENTS),
  time: z.number().nullable(),
  timeUnit: z.enum(TIME_UNIT).nullable(),
  userId: z.number().nullable(),
  teamId: z.number().nullable(),
  steps: z
    .object({
      id: z.number(),
      action: z.enum(WORKFLOW_ACTIONS),
      sendTo: z.string().nullable(),
      template: z.enum(WORKFLOW_TEMPLATES),
      reminderBody: z.string().nullable(),
      emailSubject: z.string().nullable(),
      numberRequired: z.boolean().nullable(),
      sender: z.string().nullable(),
      includeCalendarEvent: z.boolean(),
      numberVerificationPending: z.boolean(),
      verifiedAt: z.coerce.date().nullable().optional(),
    })
    .array(),
});

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
  platformClientId?: string | null;
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
