import * as z from "zod"
import * as imports from "../zod-utils"
import { PeriodType, SchedulingType } from "@prisma/client"
import { CompleteHost, HostModel, CompleteUser, UserModel, CompleteProfile, ProfileModel, CompleteTeam, TeamModel, CompleteHashedLink, HashedLinkModel, CompleteBooking, BookingModel, CompleteAvailability, AvailabilityModel, CompleteWebhook, WebhookModel, CompleteDestinationCalendar, DestinationCalendarModel, CompleteEventTypeCustomInput, EventTypeCustomInputModel, CompleteSchedule, ScheduleModel, CompleteWorkflowsOnEventTypes, WorkflowsOnEventTypesModel, CompleteAIPhoneCallConfiguration, AIPhoneCallConfigurationModel, CompleteEventTypeTranslation, EventTypeTranslationModel, CompleteSelectedCalendar, SelectedCalendarModel, CompleteSecondaryEmail, SecondaryEmailModel } from "./index"

// Helper schema for JSON fields
type Literal = boolean | number | string
type Json = Literal | { [key: string]: Json } | Json[]
const literalSchema = z.union([z.string(), z.number(), z.boolean()])
const jsonSchema: z.ZodSchema<Json> = z.lazy(() => z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)]))

export const _EventTypeModel = z.object({
  id: z.number().int(),
  title: z.string().min(1),
  slug: imports.eventTypeSlug,
  description: z.string().nullish(),
  position: z.number().int(),
  locations: imports.eventTypeLocations,
  length: z.number().int().min(1),
  offsetStart: z.number().int(),
  hidden: z.boolean(),
  userId: z.number().int().nullish(),
  profileId: z.number().int().nullish(),
  teamId: z.number().int().nullish(),
  useEventLevelSelectedCalendars: z.boolean(),
  eventName: z.string().nullish(),
  parentId: z.number().int().nullish(),
  bookingFields: imports.eventTypeBookingFields,
  timeZone: z.string().nullish(),
  periodType: z.nativeEnum(PeriodType),
  periodStartDate: imports.coerceToDate.nullish(),
  periodEndDate: imports.coerceToDate.nullish(),
  periodDays: z.number().int().nullish(),
  periodCountCalendarDays: z.boolean().nullish(),
  lockTimeZoneToggleOnBookingPage: z.boolean(),
  requiresConfirmation: z.boolean(),
  requiresConfirmationWillBlockSlot: z.boolean(),
  requiresConfirmationForFreeEmail: z.boolean(),
  requiresBookerEmailVerification: z.boolean(),
  canSendCalVideoTranscriptionEmails: z.boolean(),
  autoTranslateDescriptionEnabled: z.boolean(),
  recurringEvent: imports.recurringEventType,
  disableGuests: z.boolean(),
  hideCalendarNotes: z.boolean(),
  hideCalendarEventDetails: z.boolean(),
  minimumBookingNotice: z.number().int().min(0),
  beforeEventBuffer: z.number().int(),
  afterEventBuffer: z.number().int(),
  seatsPerTimeSlot: z.number().int().nullish(),
  onlyShowFirstAvailableSlot: z.boolean(),
  disableCancelling: z.boolean().nullish(),
  disableRescheduling: z.boolean().nullish(),
  cancellationRestrictionTime: z.number().int().nullish(),
  reschedulingRestrictionTime: z.number().int().nullish(),
  seatsShowAttendees: z.boolean().nullish(),
  seatsShowAvailabilityCount: z.boolean().nullish(),
  schedulingType: z.nativeEnum(SchedulingType).nullish(),
  scheduleId: z.number().int().nullish(),
  price: z.number().int(),
  currency: z.string(),
  slotInterval: z.number().int().nullish(),
  metadata: imports.EventTypeMetaDataSchema,
  successRedirectUrl: imports.successRedirectUrl.nullish(),
  forwardParamsSuccessRedirect: z.boolean().nullish(),
  bookingLimits: imports.intervalLimitsType,
  durationLimits: imports.intervalLimitsType,
  isInstantEvent: z.boolean(),
  instantMeetingExpiryTimeOffsetInSeconds: z.number().int(),
  instantMeetingScheduleId: z.number().int().nullish(),
  instantMeetingParameters: z.string().array(),
  assignAllTeamMembers: z.boolean(),
  assignRRMembersUsingSegment: z.boolean(),
  rrSegmentQueryValue: imports.rrSegmentQueryValueSchema,
  useEventTypeDestinationCalendarEmail: z.boolean(),
  isRRWeightsEnabled: z.boolean(),
  maxLeadThreshold: z.number().int().nullish(),
  allowReschedulingPastBookings: z.boolean(),
  eventTypeColor: imports.eventTypeColor,
  rescheduleWithSameRoundRobinHost: z.boolean(),
  secondaryEmailId: z.number().int().nullish(),
})

export interface CompleteEventType extends z.infer<typeof _EventTypeModel> {
  hosts: CompleteHost[]
  users: CompleteUser[]
  owner?: CompleteUser | null
  profile?: CompleteProfile | null
  team?: CompleteTeam | null
  hashedLink: CompleteHashedLink[]
  bookings: CompleteBooking[]
  availability: CompleteAvailability[]
  webhooks: CompleteWebhook[]
  destinationCalendar?: CompleteDestinationCalendar | null
  customInputs: CompleteEventTypeCustomInput[]
  parent?: CompleteEventType | null
  children: CompleteEventType[]
  schedule?: CompleteSchedule | null
  workflows: CompleteWorkflowsOnEventTypes[]
  instantMeetingSchedule?: CompleteSchedule | null
  aiPhoneCallConfig?: CompleteAIPhoneCallConfiguration | null
  fieldTranslations: CompleteEventTypeTranslation[]
  selectedCalendars: CompleteSelectedCalendar[]
  secondaryEmail?: CompleteSecondaryEmail | null
}

/**
 * EventTypeModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const EventTypeModel: z.ZodSchema<CompleteEventType> = z.lazy(() => _EventTypeModel.extend({
  hosts: HostModel.array(),
  users: UserModel.array(),
  owner: UserModel.nullish(),
  profile: ProfileModel.nullish(),
  team: TeamModel.nullish(),
  hashedLink: HashedLinkModel.array(),
  bookings: BookingModel.array(),
  availability: AvailabilityModel.array(),
  webhooks: WebhookModel.array(),
  destinationCalendar: DestinationCalendarModel.nullish(),
  customInputs: EventTypeCustomInputModel.array(),
  parent: EventTypeModel.nullish(),
  children: EventTypeModel.array(),
  schedule: ScheduleModel.nullish(),
  workflows: WorkflowsOnEventTypesModel.array(),
  instantMeetingSchedule: ScheduleModel.nullish(),
  aiPhoneCallConfig: AIPhoneCallConfigurationModel.nullish(),
  fieldTranslations: EventTypeTranslationModel.array(),
  selectedCalendars: SelectedCalendarModel.array(),
  secondaryEmail: SecondaryEmailModel.nullish(),
}))
