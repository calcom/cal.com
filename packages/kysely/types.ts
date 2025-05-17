import type { ColumnType } from "kysely";

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export const SchedulingType = {
  ROUND_ROBIN: "roundRobin",
  COLLECTIVE: "collective",
  MANAGED: "managed",
} as const;
export type SchedulingType = (typeof SchedulingType)[keyof typeof SchedulingType];
export const PeriodType = {
  UNLIMITED: "unlimited",
  ROLLING: "rolling",
  ROLLING_WINDOW: "rolling_window",
  RANGE: "range",
} as const;
export type PeriodType = (typeof PeriodType)[keyof typeof PeriodType];
export const CreationSource = {
  API_V1: "api_v1",
  API_V2: "api_v2",
  WEBAPP: "webapp",
} as const;
export type CreationSource = (typeof CreationSource)[keyof typeof CreationSource];
export const IdentityProvider = {
  CAL: "CAL",
  GOOGLE: "GOOGLE",
  SAML: "SAML",
} as const;
export type IdentityProvider = (typeof IdentityProvider)[keyof typeof IdentityProvider];
export const UserPermissionRole = {
  USER: "USER",
  ADMIN: "ADMIN",
} as const;
export type UserPermissionRole = (typeof UserPermissionRole)[keyof typeof UserPermissionRole];
export const CreditType = {
  MONTHLY: "MONTHLY",
  ADDITIONAL: "ADDITIONAL",
} as const;
export type CreditType = (typeof CreditType)[keyof typeof CreditType];
export const MembershipRole = {
  MEMBER: "MEMBER",
  ADMIN: "ADMIN",
  OWNER: "OWNER",
} as const;
export type MembershipRole = (typeof MembershipRole)[keyof typeof MembershipRole];
export const BookingStatus = {
  CANCELLED: "cancelled",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  PENDING: "pending",
  AWAITING_HOST: "awaiting_host",
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];
export const EventTypeCustomInputType = {
  TEXT: "text",
  TEXTLONG: "textLong",
  NUMBER: "number",
  BOOL: "bool",
  RADIO: "radio",
  PHONE: "phone",
} as const;
export type EventTypeCustomInputType =
  (typeof EventTypeCustomInputType)[keyof typeof EventTypeCustomInputType];
export const ReminderType = {
  PENDING_BOOKING_CONFIRMATION: "PENDING_BOOKING_CONFIRMATION",
} as const;
export type ReminderType = (typeof ReminderType)[keyof typeof ReminderType];
export const PaymentOption = {
  ON_BOOKING: "ON_BOOKING",
  HOLD: "HOLD",
} as const;
export type PaymentOption = (typeof PaymentOption)[keyof typeof PaymentOption];
export const WebhookTriggerEvents = {
  BOOKING_CREATED: "BOOKING_CREATED",
  BOOKING_PAYMENT_INITIATED: "BOOKING_PAYMENT_INITIATED",
  BOOKING_PAID: "BOOKING_PAID",
  BOOKING_RESCHEDULED: "BOOKING_RESCHEDULED",
  BOOKING_REQUESTED: "BOOKING_REQUESTED",
  BOOKING_CANCELLED: "BOOKING_CANCELLED",
  BOOKING_REJECTED: "BOOKING_REJECTED",
  BOOKING_NO_SHOW_UPDATED: "BOOKING_NO_SHOW_UPDATED",
  FORM_SUBMITTED: "FORM_SUBMITTED",
  MEETING_ENDED: "MEETING_ENDED",
  MEETING_STARTED: "MEETING_STARTED",
  RECORDING_READY: "RECORDING_READY",
  INSTANT_MEETING: "INSTANT_MEETING",
  RECORDING_TRANSCRIPTION_GENERATED: "RECORDING_TRANSCRIPTION_GENERATED",
  OOO_CREATED: "OOO_CREATED",
  AFTER_HOSTS_CAL_VIDEO_NO_SHOW: "AFTER_HOSTS_CAL_VIDEO_NO_SHOW",
  AFTER_GUESTS_CAL_VIDEO_NO_SHOW: "AFTER_GUESTS_CAL_VIDEO_NO_SHOW",
  FORM_SUBMITTED_NO_EVENT: "FORM_SUBMITTED_NO_EVENT",
} as const;
export type WebhookTriggerEvents = (typeof WebhookTriggerEvents)[keyof typeof WebhookTriggerEvents];
export const AppCategories = {
  calendar: "calendar",
  messaging: "messaging",
  other: "other",
  payment: "payment",
  video: "video",
  web3: "web3",
  automation: "automation",
  analytics: "analytics",
  conferencing: "conferencing",
  crm: "crm",
} as const;
export type AppCategories = (typeof AppCategories)[keyof typeof AppCategories];
export const WorkflowTriggerEvents = {
  BEFORE_EVENT: "BEFORE_EVENT",
  EVENT_CANCELLED: "EVENT_CANCELLED",
  NEW_EVENT: "NEW_EVENT",
  AFTER_EVENT: "AFTER_EVENT",
  RESCHEDULE_EVENT: "RESCHEDULE_EVENT",
  AFTER_HOSTS_CAL_VIDEO_NO_SHOW: "AFTER_HOSTS_CAL_VIDEO_NO_SHOW",
  AFTER_GUESTS_CAL_VIDEO_NO_SHOW: "AFTER_GUESTS_CAL_VIDEO_NO_SHOW",
} as const;
export type WorkflowTriggerEvents = (typeof WorkflowTriggerEvents)[keyof typeof WorkflowTriggerEvents];
export const WorkflowActions = {
  EMAIL_HOST: "EMAIL_HOST",
  EMAIL_ATTENDEE: "EMAIL_ATTENDEE",
  SMS_ATTENDEE: "SMS_ATTENDEE",
  SMS_NUMBER: "SMS_NUMBER",
  EMAIL_ADDRESS: "EMAIL_ADDRESS",
  WHATSAPP_ATTENDEE: "WHATSAPP_ATTENDEE",
  WHATSAPP_NUMBER: "WHATSAPP_NUMBER",
} as const;
export type WorkflowActions = (typeof WorkflowActions)[keyof typeof WorkflowActions];
export const TimeUnit = {
  DAY: "day",
  HOUR: "hour",
  MINUTE: "minute",
} as const;
export type TimeUnit = (typeof TimeUnit)[keyof typeof TimeUnit];
export const WorkflowTemplates = {
  REMINDER: "REMINDER",
  CUSTOM: "CUSTOM",
  CANCELLED: "CANCELLED",
  RESCHEDULED: "RESCHEDULED",
  COMPLETED: "COMPLETED",
  RATING: "RATING",
} as const;
export type WorkflowTemplates = (typeof WorkflowTemplates)[keyof typeof WorkflowTemplates];
export const WorkflowMethods = {
  EMAIL: "EMAIL",
  SMS: "SMS",
  WHATSAPP: "WHATSAPP",
} as const;
export type WorkflowMethods = (typeof WorkflowMethods)[keyof typeof WorkflowMethods];
export const FeatureType = {
  RELEASE: "RELEASE",
  EXPERIMENT: "EXPERIMENT",
  OPERATIONAL: "OPERATIONAL",
  KILL_SWITCH: "KILL_SWITCH",
  PERMISSION: "PERMISSION",
} as const;
export type FeatureType = (typeof FeatureType)[keyof typeof FeatureType];
export const RRResetInterval = {
  MONTH: "MONTH",
  DAY: "DAY",
} as const;
export type RRResetInterval = (typeof RRResetInterval)[keyof typeof RRResetInterval];
export const AccessScope = {
  READ_BOOKING: "READ_BOOKING",
  READ_PROFILE: "READ_PROFILE",
} as const;
export type AccessScope = (typeof AccessScope)[keyof typeof AccessScope];
export const RedirectType = {
  UserEventType: "user-event-type",
  TeamEventType: "team-event-type",
  User: "user",
  Team: "team",
} as const;
export type RedirectType = (typeof RedirectType)[keyof typeof RedirectType];
export const SMSLockState = {
  LOCKED: "LOCKED",
  UNLOCKED: "UNLOCKED",
  REVIEW_NEEDED: "REVIEW_NEEDED",
} as const;
export type SMSLockState = (typeof SMSLockState)[keyof typeof SMSLockState];
export const AttributeType = {
  TEXT: "TEXT",
  NUMBER: "NUMBER",
  SINGLE_SELECT: "SINGLE_SELECT",
  MULTI_SELECT: "MULTI_SELECT",
} as const;
export type AttributeType = (typeof AttributeType)[keyof typeof AttributeType];
export const AssignmentReasonEnum = {
  ROUTING_FORM_ROUTING: "ROUTING_FORM_ROUTING",
  ROUTING_FORM_ROUTING_FALLBACK: "ROUTING_FORM_ROUTING_FALLBACK",
  REASSIGNED: "REASSIGNED",
  RR_REASSIGNED: "RR_REASSIGNED",
  REROUTED: "REROUTED",
  SALESFORCE_ASSIGNMENT: "SALESFORCE_ASSIGNMENT",
} as const;
export type AssignmentReasonEnum = (typeof AssignmentReasonEnum)[keyof typeof AssignmentReasonEnum];
export const EventTypeAutoTranslatedField = {
  DESCRIPTION: "DESCRIPTION",
  TITLE: "TITLE",
} as const;
export type EventTypeAutoTranslatedField =
  (typeof EventTypeAutoTranslatedField)[keyof typeof EventTypeAutoTranslatedField];
export const WatchlistType = {
  EMAIL: "EMAIL",
  DOMAIN: "DOMAIN",
  USERNAME: "USERNAME",
} as const;
export type WatchlistType = (typeof WatchlistType)[keyof typeof WatchlistType];
export const WatchlistSeverity = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const;
export type WatchlistSeverity = (typeof WatchlistSeverity)[keyof typeof WatchlistSeverity];
export const BillingPeriod = {
  MONTHLY: "MONTHLY",
  ANNUALLY: "ANNUALLY",
} as const;
export type BillingPeriod = (typeof BillingPeriod)[keyof typeof BillingPeriod];
export const IncompleteBookingActionType = {
  SALESFORCE: "SALESFORCE",
} as const;
export type IncompleteBookingActionType =
  (typeof IncompleteBookingActionType)[keyof typeof IncompleteBookingActionType];
export const FilterSegmentScope = {
  USER: "USER",
  TEAM: "TEAM",
} as const;
export type FilterSegmentScope = (typeof FilterSegmentScope)[keyof typeof FilterSegmentScope];
export const WorkflowContactType = {
  PHONE: "PHONE",
  EMAIL: "EMAIL",
} as const;
export type WorkflowContactType = (typeof WorkflowContactType)[keyof typeof WorkflowContactType];
export type AccessCode = {
  id: Generated<number>;
  code: string;
  clientId: string | null;
  expiresAt: Timestamp;
  scopes: AccessScope[];
  userId: number | null;
  teamId: number | null;
};
export type AccessToken = {
  id: Generated<number>;
  secret: string;
  createdAt: Generated<Timestamp>;
  expiresAt: Timestamp;
  platformOAuthClientId: string;
  userId: number;
};
export type Account = {
  id: string;
  userId: number;
  type: string;
  provider: string;
  providerAccountId: string;
  providerEmail: string | null;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
  session_state: string | null;
};
export type AIPhoneCallConfiguration = {
  id: Generated<number>;
  eventTypeId: number;
  templateType: Generated<string>;
  schedulerName: string | null;
  generalPrompt: string | null;
  yourPhoneNumber: string;
  numberToCall: string;
  guestName: string | null;
  guestEmail: string | null;
  guestCompany: string | null;
  enabled: Generated<boolean>;
  beginMessage: string | null;
  llmId: string | null;
};
export type ApiKey = {
  id: string;
  userId: number;
  teamId: number | null;
  note: string | null;
  createdAt: Generated<Timestamp>;
  expiresAt: Timestamp | null;
  lastUsedAt: Timestamp | null;
  hashedKey: string;
  appId: string | null;
};
export type App = {
  slug: string;
  dirName: string;
  keys: unknown | null;
  categories: AppCategories[];
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
  enabled: Generated<boolean>;
};
export type App_RoutingForms_Form = {
  id: string;
  description: string | null;
  position: Generated<number>;
  routes: unknown | null;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
  name: string;
  fields: unknown | null;
  updatedById: number | null;
  userId: number;
  teamId: number | null;
  disabled: Generated<boolean>;
  /**
   * @zod.custom(imports.RoutingFormSettings)
   */
  settings: unknown | null;
};
export type App_RoutingForms_FormResponse = {
  id: Generated<number>;
  formFillerId: string;
  formId: string;
  response: unknown;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp | null;
  routedToBookingUid: string | null;
  chosenRouteId: string | null;
};
export type App_RoutingForms_IncompleteBookingActions = {
  id: Generated<number>;
  formId: string;
  actionType: IncompleteBookingActionType;
  data: unknown;
  enabled: Generated<boolean>;
  credentialId: number | null;
};
export type AssignmentReason = {
  id: Generated<number>;
  createdAt: Generated<Timestamp>;
  bookingId: number;
  reasonEnum: AssignmentReasonEnum;
  reasonString: string;
};
export type Attendee = {
  id: Generated<number>;
  email: string;
  name: string;
  timeZone: string;
  phoneNumber: string | null;
  locale: Generated<string | null>;
  bookingId: number | null;
  noShow: Generated<boolean | null>;
};
export type Attribute = {
  id: string;
  teamId: number;
  type: AttributeType;
  name: string;
  slug: string;
  enabled: Generated<boolean>;
  usersCanEditRelation: Generated<boolean>;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
  isWeightsEnabled: Generated<boolean>;
  isLocked: Generated<boolean>;
};
export type AttributeOption = {
  id: string;
  attributeId: string;
  value: string;
  slug: string;
  isGroup: Generated<boolean>;
  contains: string[];
};
export type AttributeToUser = {
  id: string;
  memberId: number;
  attributeOptionId: string;
  weight: number | null;
  createdAt: Generated<Timestamp>;
  createdById: number | null;
  createdByDSyncId: string | null;
  updatedAt: Timestamp | null;
  updatedById: number | null;
  updatedByDSyncId: string | null;
};
export type Availability = {
  id: Generated<number>;
  userId: number | null;
  eventTypeId: number | null;
  days: number[];
  startTime: Timestamp;
  endTime: Timestamp;
  date: Timestamp | null;
  scheduleId: number | null;
};
export type Avatar = {
  teamId: Generated<number>;
  userId: Generated<number>;
  data: string;
  objectKey: string;
  isBanner: Generated<boolean>;
};
export type Booking = {
  id: Generated<number>;
  uid: string;
  idempotencyKey: string | null;
  userId: number | null;
  /**
   * @zod.custom(imports.emailSchema)
   */
  userPrimaryEmail: string | null;
  eventTypeId: number | null;
  title: string;
  description: string | null;
  customInputs: unknown | null;
  /**
   * @zod.custom(imports.bookingResponses)
   */
  responses: unknown | null;
  startTime: Timestamp;
  endTime: Timestamp;
  location: string | null;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp | null;
  status: Generated<BookingStatus>;
  paid: Generated<boolean>;
  destinationCalendarId: number | null;
  cancellationReason: string | null;
  rejectionReason: string | null;
  reassignReason: string | null;
  reassignById: number | null;
  dynamicEventSlugRef: string | null;
  dynamicGroupSlugRef: string | null;
  rescheduled: boolean | null;
  fromReschedule: string | null;
  recurringEventId: string | null;
  smsReminderNumber: string | null;
  scheduledJobs: string[];
  /**
   * @zod.custom(imports.bookingMetadataSchema)
   */
  metadata: unknown | null;
  isRecorded: Generated<boolean>;
  iCalUID: Generated<string | null>;
  iCalSequence: Generated<number>;
  rating: number | null;
  ratingFeedback: string | null;
  noShowHost: Generated<boolean | null>;
  oneTimePassword: string | null;
  /**
   * @zod.email()
   */
  cancelledBy: string | null;
  /**
   * @zod.email()
   */
  rescheduledBy: string | null;
  creationSource: CreationSource | null;
};
export type BookingDenormalized = {
  id: number;
  uid: string;
  eventTypeId: number | null;
  title: string;
  description: string | null;
  startTime: Timestamp;
  endTime: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp | null;
  location: string | null;
  paid: boolean;
  status: BookingStatus;
  rescheduled: boolean | null;
  userId: number | null;
  teamId: number | null;
  eventLength: number | null;
  eventParentId: number | null;
  userEmail: string | null;
  userName: string | null;
  userUsername: string | null;
  ratingFeedback: string | null;
  rating: number | null;
  noShowHost: boolean | null;
  isTeamBooking: boolean;
};
export type BookingInternalNote = {
  id: Generated<number>;
  notePresetId: number | null;
  text: string | null;
  bookingId: number;
  createdById: number;
  createdAt: Generated<Timestamp>;
};
export type BookingReference = {
  id: Generated<number>;
  /**
   * @zod.min(1)
   */
  type: string;
  /**
   * @zod.min(1)
   */
  uid: string;
  meetingId: string | null;
  thirdPartyRecurringEventId: string | null;
  meetingPassword: string | null;
  meetingUrl: string | null;
  bookingId: number | null;
  externalCalendarId: string | null;
  deleted: boolean | null;
  credentialId: number | null;
  delegationCredentialId: string | null;
  domainWideDelegationCredentialId: string | null;
};
export type BookingSeat = {
  id: Generated<number>;
  referenceUid: string;
  bookingId: number;
  attendeeId: number;
  /**
   * @zod.custom(imports.bookingSeatDataSchema)
   */
  data: unknown | null;
  metadata: unknown | null;
};
export type BookingTimeStatus = {
  id: number;
  uid: string | null;
  eventTypeId: number | null;
  title: string | null;
  description: string | null;
  startTime: Timestamp | null;
  endTime: Timestamp | null;
  createdAt: Timestamp | null;
  location: string | null;
  paid: boolean | null;
  status: BookingStatus | null;
  rescheduled: boolean | null;
  userId: number | null;
  teamId: number | null;
  eventLength: number | null;
  timeStatus: string | null;
  eventParentId: number | null;
  userEmail: string | null;
  username: string | null;
  ratingFeedback: string | null;
  rating: number | null;
  noShowHost: boolean | null;
  isTeamBooking: boolean;
};
export type BookingTimeStatusDenormalized = {
  id: number;
  uid: string;
  eventTypeId: number | null;
  title: string;
  description: string | null;
  startTime: Timestamp;
  endTime: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp | null;
  location: string | null;
  paid: boolean;
  status: BookingStatus;
  rescheduled: boolean | null;
  userId: number | null;
  teamId: number | null;
  eventLength: number | null;
  eventParentId: number | null;
  userEmail: string | null;
  userName: string | null;
  userUsername: string | null;
  ratingFeedback: string | null;
  rating: number | null;
  noShowHost: boolean | null;
  isTeamBooking: boolean;
  timeStatus: string | null;
};
export type CalendarCache = {
  id: string | null;
  key: string;
  value: unknown;
  expiresAt: Timestamp;
  credentialId: number;
  userId: number | null;
};
export type Credential = {
  id: Generated<number>;
  type: string;
  key: unknown;
  userId: number | null;
  teamId: number | null;
  appId: string | null;
  subscriptionId: string | null;
  paymentStatus: string | null;
  billingCycleStart: number | null;
  invalid: Generated<boolean | null>;
  delegationCredentialId: string | null;
};
export type CreditBalance = {
  id: string;
  teamId: number | null;
  userId: number | null;
  additionalCredits: Generated<number>;
  limitReachedAt: Timestamp | null;
  warningSentAt: Timestamp | null;
};
export type CreditExpenseLog = {
  id: string;
  creditBalanceId: string;
  bookingUid: string | null;
  credits: number | null;
  creditType: CreditType;
  date: Timestamp;
  smsSid: string | null;
};
export type DelegationCredential = {
  id: string;
  workspacePlatformId: number;
  /**
   * @zod.custom(imports.serviceAccountKeySchema)
   */
  serviceAccountKey: unknown;
  enabled: Generated<boolean>;
  organizationId: number;
  domain: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
};
export type Deployment = {
  /**
   * This is a single row table, so we use a fixed id
   */
  id: Generated<number>;
  logo: string | null;
  /**
   * @zod.custom(imports.DeploymentTheme)
   */
  theme: unknown | null;
  licenseKey: string | null;
  agreedLicenseAt: Timestamp | null;
};
export type DestinationCalendar = {
  id: Generated<number>;
  integration: string;
  externalId: string;
  /**
   * @zod.custom(imports.emailSchema)
   */
  primaryEmail: string | null;
  userId: number | null;
  eventTypeId: number | null;
  credentialId: number | null;
  delegationCredentialId: string | null;
  domainWideDelegationCredentialId: string | null;
};
export type DomainWideDelegation = {
  id: string;
  workspacePlatformId: number;
  /**
   * @zod.custom(imports.serviceAccountKeySchema)
   */
  serviceAccountKey: unknown;
  enabled: Generated<boolean>;
  organizationId: number;
  domain: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
};
export type DSyncData = {
  id: Generated<number>;
  directoryId: string;
  tenant: string;
  organizationId: number | null;
};
export type DSyncTeamGroupMapping = {
  id: Generated<number>;
  organizationId: number;
  teamId: number;
  directoryId: string;
  groupName: string;
};
export type EventType = {
  id: Generated<number>;
  /**
   * @zod.min(1)
   */
  title: string;
  /**
   * @zod.custom(imports.eventTypeSlug)
   */
  slug: string;
  description: string | null;
  position: Generated<number>;
  /**
   * @zod.custom(imports.eventTypeLocations)
   */
  locations: unknown | null;
  /**
   * @zod.min(1)
   */
  length: number;
  offsetStart: Generated<number>;
  hidden: Generated<boolean>;
  userId: number | null;
  profileId: number | null;
  teamId: number | null;
  useEventLevelSelectedCalendars: Generated<boolean>;
  eventName: string | null;
  parentId: number | null;
  /**
   * @zod.custom(imports.eventTypeBookingFields)
   */
  bookingFields: unknown | null;
  timeZone: string | null;
  periodType: Generated<PeriodType>;
  /**
   * @zod.custom(imports.coerceToDate)
   */
  periodStartDate: Timestamp | null;
  /**
   * @zod.custom(imports.coerceToDate)
   */
  periodEndDate: Timestamp | null;
  periodDays: number | null;
  periodCountCalendarDays: boolean | null;
  lockTimeZoneToggleOnBookingPage: Generated<boolean>;
  requiresConfirmation: Generated<boolean>;
  requiresConfirmationWillBlockSlot: Generated<boolean>;
  requiresConfirmationForFreeEmail: Generated<boolean>;
  requiresBookerEmailVerification: Generated<boolean>;
  canSendCalVideoTranscriptionEmails: Generated<boolean>;
  autoTranslateDescriptionEnabled: Generated<boolean>;
  /**
   * @zod.custom(imports.recurringEventType)
   */
  recurringEvent: unknown | null;
  disableGuests: Generated<boolean>;
  hideCalendarNotes: Generated<boolean>;
  hideCalendarEventDetails: Generated<boolean>;
  /**
   * @zod.min(0)
   */
  minimumBookingNotice: Generated<number>;
  beforeEventBuffer: Generated<number>;
  afterEventBuffer: Generated<number>;
  seatsPerTimeSlot: number | null;
  onlyShowFirstAvailableSlot: Generated<boolean>;
  disableCancelling: Generated<boolean | null>;
  disableRescheduling: Generated<boolean | null>;
  seatsShowAttendees: Generated<boolean | null>;
  seatsShowAvailabilityCount: Generated<boolean | null>;
  schedulingType: SchedulingType | null;
  scheduleId: number | null;
  price: Generated<number>;
  currency: Generated<string>;
  slotInterval: number | null;
  /**
   * @zod.custom(imports.EventTypeMetaDataSchema)
   */
  metadata: unknown | null;
  /**
   * @zod.custom(imports.successRedirectUrl)
   */
  successRedirectUrl: string | null;
  forwardParamsSuccessRedirect: Generated<boolean | null>;
  /**
   * @zod.custom(imports.intervalLimitsType)
   */
  bookingLimits: unknown | null;
  /**
   * @zod.custom(imports.intervalLimitsType)
   */
  durationLimits: unknown | null;
  isInstantEvent: Generated<boolean>;
  instantMeetingExpiryTimeOffsetInSeconds: Generated<number>;
  instantMeetingScheduleId: number | null;
  instantMeetingParameters: string[];
  assignAllTeamMembers: Generated<boolean>;
  assignRRMembersUsingSegment: Generated<boolean>;
  /**
   * @zod.custom(imports.rrSegmentQueryValueSchema)
   */
  rrSegmentQueryValue: unknown | null;
  useEventTypeDestinationCalendarEmail: Generated<boolean>;
  isRRWeightsEnabled: Generated<boolean>;
  maxLeadThreshold: number | null;
  includeNoShowInRRCalculation: Generated<boolean>;
  allowReschedulingPastBookings: Generated<boolean>;
  hideOrganizerEmail: Generated<boolean>;
  /**
   * @zod.custom(imports.emailSchema)
   */
  customReplyToEmail: string | null;
  /**
   * @zod.custom(imports.eventTypeColor)
   */
  eventTypeColor: unknown | null;
  rescheduleWithSameRoundRobinHost: Generated<boolean>;
  secondaryEmailId: number | null;
};
export type EventTypeCustomInput = {
  id: Generated<number>;
  eventTypeId: number;
  label: string;
  type: EventTypeCustomInputType;
  /**
   * @zod.custom(imports.customInputOptionSchema)
   */
  options: unknown | null;
  required: boolean;
  placeholder: Generated<string>;
};
export type EventTypeTranslation = {
  uid: string;
  eventTypeId: number;
  field: EventTypeAutoTranslatedField;
  sourceLocale: string;
  targetLocale: string;
  translatedText: string;
  createdAt: Generated<Timestamp>;
  createdBy: number;
  updatedAt: Timestamp;
  updatedBy: number | null;
};
export type Feature = {
  slug: string;
  enabled: Generated<boolean>;
  description: string | null;
  type: Generated<FeatureType | null>;
  stale: Generated<boolean | null>;
  lastUsedAt: Timestamp | null;
  createdAt: Generated<Timestamp | null>;
  updatedAt: Generated<Timestamp | null>;
  updatedBy: number | null;
};
export type Feedback = {
  id: Generated<number>;
  date: Generated<Timestamp>;
  userId: number;
  rating: string;
  comment: string | null;
};
export type FilterSegment = {
  id: Generated<number>;
  name: string;
  tableIdentifier: string;
  scope: FilterSegmentScope;
  activeFilters: unknown | null;
  sorting: unknown | null;
  columnVisibility: unknown | null;
  columnSizing: unknown | null;
  perPage: number;
  searchTerm: string | null;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
  userId: number;
  teamId: number | null;
};
export type HashedLink = {
  id: Generated<number>;
  link: string;
  eventTypeId: number;
};
export type Host = {
  userId: number;
  eventTypeId: number;
  isFixed: Generated<boolean>;
  priority: number | null;
  weight: number | null;
  weightAdjustment: number | null;
  scheduleId: number | null;
  createdAt: Generated<Timestamp>;
};
export type Impersonations = {
  id: Generated<number>;
  createdAt: Generated<Timestamp>;
  impersonatedUserId: number;
  impersonatedById: number;
};
export type InstantMeetingToken = {
  id: Generated<number>;
  token: string;
  expires: Timestamp;
  teamId: number;
  bookingId: number | null;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
};
export type InternalNotePreset = {
  id: Generated<number>;
  name: string;
  cancellationReason: string | null;
  teamId: number;
  createdAt: Generated<Timestamp>;
};
export type ManagedOrganization = {
  managedOrganizationId: number;
  managerOrganizationId: number;
  createdAt: Generated<Timestamp>;
};
export type Membership = {
  id: Generated<number>;
  teamId: number;
  userId: number;
  accepted: Generated<boolean>;
  role: MembershipRole;
  disableImpersonation: Generated<boolean>;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};
export type NotificationsSubscriptions = {
  id: Generated<number>;
  userId: number;
  subscription: string;
};
export type OAuthClient = {
  clientId: string;
  redirectUri: string;
  clientSecret: string;
  name: string;
  logo: string | null;
};
export type OrganizationOnboarding = {
  id: string;
  createdById: number;
  createdAt: Generated<Timestamp>;
  orgOwnerEmail: string;
  error: string | null;
  updatedAt: Timestamp;
  organizationId: number | null;
  billingPeriod: BillingPeriod;
  pricePerSeat: number;
  seats: number;
  isPlatform: Generated<boolean>;
  name: string;
  slug: string;
  logo: string | null;
  bio: string | null;
  isDomainConfigured: Generated<boolean>;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeSubscriptionItemId: string | null;
  /**
   * @zod.custom(imports.orgOnboardingInvitedMembersSchema)
   */
  invitedMembers: Generated<unknown>;
  /**
   * @zod.custom(imports.orgOnboardingTeamsSchema)
   */
  teams: Generated<unknown>;
  isComplete: Generated<boolean>;
};
export type OrganizationSettings = {
  id: Generated<number>;
  organizationId: number;
  isOrganizationConfigured: Generated<boolean>;
  isOrganizationVerified: Generated<boolean>;
  orgAutoAcceptEmail: string;
  lockEventTypeCreationForUsers: Generated<boolean>;
  adminGetsNoSlotsNotification: Generated<boolean>;
  isAdminReviewed: Generated<boolean>;
  isAdminAPIEnabled: Generated<boolean>;
  allowSEOIndexing: Generated<boolean>;
  orgProfileRedirectsToVerifiedDomain: Generated<boolean>;
  disablePhoneOnlySMSNotifications: Generated<boolean>;
};
export type OutOfOfficeEntry = {
  id: Generated<number>;
  uuid: string;
  start: Timestamp;
  end: Timestamp;
  notes: string | null;
  userId: number;
  toUserId: number | null;
  reasonId: number | null;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
};
export type OutOfOfficeReason = {
  id: Generated<number>;
  emoji: string;
  reason: string;
  enabled: Generated<boolean>;
  userId: number | null;
};
export type Payment = {
  id: Generated<number>;
  uid: string;
  appId: string | null;
  bookingId: number;
  amount: number;
  fee: number;
  currency: string;
  success: boolean;
  refunded: boolean;
  data: unknown;
  externalId: string;
  paymentOption: Generated<PaymentOption | null>;
};
export type PlatformAuthorizationToken = {
  id: string;
  platformOAuthClientId: string;
  userId: number;
  createdAt: Generated<Timestamp>;
};
export type PlatformBilling = {
  id: number;
  customerId: string;
  subscriptionId: string | null;
  priceId: string | null;
  plan: Generated<string>;
  billingCycleStart: number | null;
  billingCycleEnd: number | null;
  overdue: Generated<boolean | null>;
  managerBillingId: number | null;
};
export type PlatformOAuthClient = {
  id: string;
  name: string;
  secret: string;
  permissions: number;
  logo: string | null;
  redirectUris: string[];
  organizationId: number;
  bookingRedirectUri: string | null;
  bookingCancelRedirectUri: string | null;
  bookingRescheduleRedirectUri: string | null;
  areEmailsEnabled: Generated<boolean>;
  areDefaultEventTypesEnabled: Generated<boolean>;
  createdAt: Generated<Timestamp>;
};
export type PlatformOAuthClientToUser = {
  A: string;
  B: number;
};
export type Profile = {
  id: Generated<number>;
  uid: string;
  userId: number;
  organizationId: number;
  username: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
};
export type RateLimit = {
  id: string;
  name: string;
  apiKeyId: string;
  ttl: number;
  limit: number;
  blockDuration: number;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
};
export type RefreshToken = {
  id: Generated<number>;
  secret: string;
  createdAt: Generated<Timestamp>;
  expiresAt: Timestamp;
  platformOAuthClientId: string;
  userId: number;
};
export type ReminderMail = {
  id: Generated<number>;
  referenceId: number;
  reminderType: ReminderType;
  elapsedMinutes: number;
  createdAt: Generated<Timestamp>;
};
export type ResetPasswordRequest = {
  id: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
  email: string;
  expires: Timestamp;
};
export type RoutingFormResponse = {
  id: number;
  response: unknown;
  responseLowercase: unknown;
  formId: string;
  formName: string;
  formTeamId: number | null;
  formUserId: number | null;
  bookingUid: string | null;
  bookingStatus: BookingStatus | null;
  bookingStatusOrder: number | null;
  bookingCreatedAt: Timestamp | null;
  bookingAttendees: unknown | null;
  bookingUserId: number | null;
  bookingUserName: string | null;
  bookingUserEmail: string | null;
  bookingUserAvatarUrl: string | null;
  bookingAssignmentReason: string | null;
  bookingAssignmentReasonLowercase: string | null;
  bookingStartTime: Timestamp | null;
  bookingEndTime: Timestamp | null;
  createdAt: Timestamp;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
};
export type Schedule = {
  id: Generated<number>;
  userId: number;
  name: string;
  timeZone: string | null;
};
export type SecondaryEmail = {
  id: Generated<number>;
  userId: number;
  email: string;
  emailVerified: Timestamp | null;
};
export type SelectedCalendar = {
  id: string;
  userId: number;
  integration: string;
  externalId: string;
  credentialId: number | null;
  googleChannelId: string | null;
  googleChannelKind: string | null;
  googleChannelResourceId: string | null;
  googleChannelResourceUri: string | null;
  googleChannelExpiration: string | null;
  delegationCredentialId: string | null;
  domainWideDelegationCredentialId: string | null;
  error: string | null;
  eventTypeId: number | null;
};
export type SelectedSlots = {
  id: Generated<number>;
  eventTypeId: number;
  userId: number;
  slotUtcStartDate: Timestamp;
  slotUtcEndDate: Timestamp;
  uid: string;
  releaseAt: Timestamp;
  isSeat: Generated<boolean>;
};
export type Session = {
  id: string;
  sessionToken: string;
  userId: number;
  expires: Timestamp;
};
export type Task = {
  id: string;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
  scheduledAt: Generated<Timestamp>;
  succeededAt: Timestamp | null;
  type: string;
  payload: string;
  attempts: Generated<number>;
  maxAttempts: Generated<number>;
  lastError: string | null;
  lastFailedAttemptAt: Timestamp | null;
  referenceUid: string | null;
};
export type Team = {
  id: Generated<number>;
  /**
   * @zod.min(1)
   */
  name: string;
  /**
   * @zod.min(1)
   */
  slug: string | null;
  logoUrl: string | null;
  calVideoLogo: string | null;
  appLogo: string | null;
  appIconLogo: string | null;
  bio: string | null;
  hideBranding: Generated<boolean>;
  hideTeamProfileLink: Generated<boolean>;
  isPrivate: Generated<boolean>;
  hideBookATeamMember: Generated<boolean>;
  createdAt: Generated<Timestamp>;
  /**
   * @zod.custom(imports.teamMetadataSchema)
   */
  metadata: unknown | null;
  theme: string | null;
  rrResetInterval: Generated<RRResetInterval | null>;
  brandColor: string | null;
  darkBrandColor: string | null;
  bannerUrl: string | null;
  parentId: number | null;
  timeFormat: number | null;
  timeZone: Generated<string>;
  weekStart: Generated<string>;
  isOrganization: Generated<boolean>;
  pendingPayment: Generated<boolean>;
  isPlatform: Generated<boolean>;
  createdByOAuthClientId: string | null;
  smsLockState: Generated<SMSLockState>;
  smsLockReviewedByAdmin: Generated<boolean>;
  /**
   * @zod.custom(imports.intervalLimitsType)
   */
  bookingLimits: unknown | null;
  includeManagedEventsInLimits: Generated<boolean>;
};
export type TeamFeatures = {
  teamId: number;
  featureId: string;
  assignedAt: Generated<Timestamp>;
  assignedBy: string;
  updatedAt: Timestamp;
};
export type TempOrgRedirect = {
  id: Generated<number>;
  from: string;
  fromOrgId: number;
  type: RedirectType;
  toUrl: string;
  enabled: Generated<boolean>;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
};
export type Tracking = {
  id: Generated<number>;
  bookingId: number;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
};
export type TravelSchedule = {
  id: Generated<number>;
  userId: number;
  timeZone: string;
  startDate: Timestamp;
  endDate: Timestamp | null;
  prevTimeZone: string | null;
};
export type User = {
  id: Generated<number>;
  username: string | null;
  name: string | null;
  /**
   * @zod.custom(imports.emailSchema)
   */
  email: string;
  emailVerified: Timestamp | null;
  bio: string | null;
  avatarUrl: string | null;
  timeZone: Generated<string>;
  weekStart: Generated<string>;
  startTime: Generated<number>;
  endTime: Generated<number>;
  bufferTime: Generated<number>;
  hideBranding: Generated<boolean>;
  theme: string | null;
  appTheme: string | null;
  created: Generated<Timestamp>;
  trialEndsAt: Timestamp | null;
  lastActiveAt: Timestamp | null;
  defaultScheduleId: number | null;
  completedOnboarding: Generated<boolean>;
  locale: string | null;
  timeFormat: Generated<number | null>;
  twoFactorSecret: string | null;
  twoFactorEnabled: Generated<boolean>;
  backupCodes: string | null;
  identityProvider: Generated<IdentityProvider>;
  identityProviderId: string | null;
  invitedTo: number | null;
  brandColor: string | null;
  darkBrandColor: string | null;
  allowDynamicBooking: Generated<boolean | null>;
  allowSEOIndexing: Generated<boolean | null>;
  receiveMonthlyDigestEmail: Generated<boolean | null>;
  /**
   * @zod.custom(imports.userMetadata)
   */
  metadata: unknown | null;
  verified: Generated<boolean | null>;
  role: Generated<UserPermissionRole>;
  disableImpersonation: Generated<boolean>;
  organizationId: number | null;
  locked: Generated<boolean>;
  movedToProfileId: number | null;
  isPlatformManaged: Generated<boolean>;
  smsLockState: Generated<SMSLockState>;
  smsLockReviewedByAdmin: Generated<boolean>;
  referralLinkId: string | null;
  creationSource: CreationSource | null;
  whitelistWorkflows: Generated<boolean>;
};
export type user_eventtype = {
  A: number;
  B: number;
};
export type UserFeatures = {
  userId: number;
  featureId: string;
  assignedAt: Generated<Timestamp>;
  assignedBy: string;
  updatedAt: Timestamp;
};
export type UserPassword = {
  hash: string;
  userId: number;
};
export type VerificationToken = {
  id: Generated<number>;
  identifier: string;
  token: string;
  expires: Timestamp;
  expiresInDays: number | null;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
  teamId: number | null;
  secondaryEmailId: number | null;
};
export type VerifiedEmail = {
  id: Generated<number>;
  userId: number | null;
  teamId: number | null;
  email: string;
};
export type VerifiedNumber = {
  id: Generated<number>;
  userId: number | null;
  teamId: number | null;
  phoneNumber: string;
};
export type Watchlist = {
  id: string;
  type: WatchlistType;
  value: string;
  description: string | null;
  createdAt: Generated<Timestamp>;
  createdById: number;
  updatedAt: Timestamp;
  updatedById: number | null;
  severity: Generated<WatchlistSeverity>;
};
export type Webhook = {
  id: string;
  userId: number | null;
  teamId: number | null;
  eventTypeId: number | null;
  platformOAuthClientId: string | null;
  /**
   * @zod.url()
   */
  subscriberUrl: string;
  payloadTemplate: string | null;
  createdAt: Generated<Timestamp>;
  active: Generated<boolean>;
  eventTriggers: WebhookTriggerEvents[];
  appId: string | null;
  secret: string | null;
  platform: Generated<boolean>;
  time: number | null;
  timeUnit: TimeUnit | null;
};
export type WebhookScheduledTriggers = {
  id: Generated<number>;
  jobName: string | null;
  subscriberUrl: string;
  payload: string;
  startAfter: Timestamp;
  retryCount: Generated<number>;
  createdAt: Generated<Timestamp | null>;
  appId: string | null;
  webhookId: string | null;
  bookingId: number | null;
};
export type Workflow = {
  id: Generated<number>;
  position: Generated<number>;
  name: string;
  userId: number | null;
  teamId: number | null;
  isActiveOnAll: Generated<boolean>;
  trigger: WorkflowTriggerEvents;
  time: number | null;
  timeUnit: TimeUnit | null;
};
export type WorkflowOptOutContact = {
  id: Generated<number>;
  type: WorkflowContactType;
  value: string;
  optedOut: boolean;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
};
export type WorkflowReminder = {
  id: Generated<number>;
  uuid: string | null;
  bookingUid: string | null;
  method: WorkflowMethods;
  scheduledDate: Timestamp;
  referenceId: string | null;
  scheduled: boolean;
  workflowStepId: number | null;
  cancelled: boolean | null;
  seatReferenceId: string | null;
  isMandatoryReminder: Generated<boolean | null>;
  retryCount: Generated<number>;
};
export type WorkflowsOnEventTypes = {
  id: Generated<number>;
  workflowId: number;
  eventTypeId: number;
};
export type WorkflowsOnTeams = {
  id: Generated<number>;
  workflowId: number;
  teamId: number;
};
export type WorkflowStep = {
  id: Generated<number>;
  stepNumber: number;
  action: WorkflowActions;
  workflowId: number;
  sendTo: string | null;
  reminderBody: string | null;
  emailSubject: string | null;
  template: Generated<WorkflowTemplates>;
  numberRequired: boolean | null;
  sender: string | null;
  numberVerificationPending: Generated<boolean>;
  includeCalendarEvent: Generated<boolean>;
  verifiedAt: Timestamp | null;
};
export type WorkspacePlatform = {
  id: Generated<number>;
  /**
   * @zod.min(1)
   */
  slug: string;
  /**
   * @zod.min(1)
   */
  name: string;
  description: string;
  /**
   * @zod.custom(imports.serviceAccountKeySchema)
   */
  defaultServiceAccountKey: unknown;
  createdAt: Generated<Timestamp>;
  updatedAt: Timestamp;
  enabled: Generated<boolean>;
};
export type DB = {
  _PlatformOAuthClientToUser: PlatformOAuthClientToUser;
  _user_eventtype: user_eventtype;
  AccessCode: AccessCode;
  AccessToken: AccessToken;
  Account: Account;
  AIPhoneCallConfiguration: AIPhoneCallConfiguration;
  ApiKey: ApiKey;
  App: App;
  App_RoutingForms_Form: App_RoutingForms_Form;
  App_RoutingForms_FormResponse: App_RoutingForms_FormResponse;
  App_RoutingForms_IncompleteBookingActions: App_RoutingForms_IncompleteBookingActions;
  AssignmentReason: AssignmentReason;
  Attendee: Attendee;
  Attribute: Attribute;
  AttributeOption: AttributeOption;
  AttributeToUser: AttributeToUser;
  Availability: Availability;
  avatars: Avatar;
  Booking: Booking;
  BookingDenormalized: BookingDenormalized;
  BookingInternalNote: BookingInternalNote;
  BookingReference: BookingReference;
  BookingSeat: BookingSeat;
  BookingTimeStatus: BookingTimeStatus;
  BookingTimeStatusDenormalized: BookingTimeStatusDenormalized;
  CalendarCache: CalendarCache;
  Credential: Credential;
  CreditBalance: CreditBalance;
  CreditExpenseLog: CreditExpenseLog;
  DelegationCredential: DelegationCredential;
  Deployment: Deployment;
  DestinationCalendar: DestinationCalendar;
  DomainWideDelegation: DomainWideDelegation;
  DSyncData: DSyncData;
  DSyncTeamGroupMapping: DSyncTeamGroupMapping;
  EventType: EventType;
  EventTypeCustomInput: EventTypeCustomInput;
  EventTypeTranslation: EventTypeTranslation;
  Feature: Feature;
  Feedback: Feedback;
  FilterSegment: FilterSegment;
  HashedLink: HashedLink;
  Host: Host;
  Impersonations: Impersonations;
  InstantMeetingToken: InstantMeetingToken;
  InternalNotePreset: InternalNotePreset;
  ManagedOrganization: ManagedOrganization;
  Membership: Membership;
  NotificationsSubscriptions: NotificationsSubscriptions;
  OAuthClient: OAuthClient;
  OrganizationOnboarding: OrganizationOnboarding;
  OrganizationSettings: OrganizationSettings;
  OutOfOfficeEntry: OutOfOfficeEntry;
  OutOfOfficeReason: OutOfOfficeReason;
  Payment: Payment;
  PlatformAuthorizationToken: PlatformAuthorizationToken;
  PlatformBilling: PlatformBilling;
  PlatformOAuthClient: PlatformOAuthClient;
  Profile: Profile;
  RateLimit: RateLimit;
  RefreshToken: RefreshToken;
  ReminderMail: ReminderMail;
  ResetPasswordRequest: ResetPasswordRequest;
  RoutingFormResponse: RoutingFormResponse;
  Schedule: Schedule;
  SecondaryEmail: SecondaryEmail;
  SelectedCalendar: SelectedCalendar;
  SelectedSlots: SelectedSlots;
  Session: Session;
  Task: Task;
  Team: Team;
  TeamFeatures: TeamFeatures;
  TempOrgRedirect: TempOrgRedirect;
  Tracking: Tracking;
  TravelSchedule: TravelSchedule;
  UserFeatures: UserFeatures;
  UserPassword: UserPassword;
  users: User;
  VerificationToken: VerificationToken;
  VerifiedEmail: VerifiedEmail;
  VerifiedNumber: VerifiedNumber;
  Watchlist: Watchlist;
  Webhook: Webhook;
  WebhookScheduledTriggers: WebhookScheduledTriggers;
  Workflow: Workflow;
  WorkflowOptOutContact: WorkflowOptOutContact;
  WorkflowReminder: WorkflowReminder;
  WorkflowsOnEventTypes: WorkflowsOnEventTypes;
  WorkflowsOnTeams: WorkflowsOnTeams;
  WorkflowStep: WorkflowStep;
  WorkspacePlatform: WorkspacePlatform;
};
