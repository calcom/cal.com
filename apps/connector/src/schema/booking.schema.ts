import { z } from "zod";

// Enums (you'll need to define these based on your existing enums)
const Status = z.enum(["upcoming", "recurring", "past", "cancelled", "unconfirmed"]);
const BookingStatus = z.enum(["PENDING", "ACCEPTED", "CANCELLED", "REJECTED"]);

// Custom transform for attendee email (replaces spaces with +)
const attendeeEmailTransform = z.string().transform((val) => val.trim().replace(/\s+/g, "+"));

export const bookingsQueryRequestSchema = z.object({
  status: z
    .enum(["upcoming", "recurring", "past", "cancelled", "unconfirmed"])
    .optional()
    .default("upcoming")
    .describe("Filter bookings by status"),

  teamIds: z.array(z.number().int().positive()).optional().describe("Filter by team IDs"),

  userIds: z.array(z.number().int().positive()).optional().describe("Filter by user IDs"),

  eventTypeIds: z.array(z.number().int().positive()).optional().describe("Filter by event type IDs"),

  attendeeEmail: z.string().email().optional().describe("Filter by attendee email"),

  attendeeName: z.string().optional().describe("Filter by attendee name"),

  bookingUid: z.string().optional().describe("Filter by booking UID"),

  afterStartDate: z.string().datetime().optional().describe("Filter bookings starting after this date"),

  beforeEndDate: z.string().datetime().optional().describe("Filter bookings ending before this date"),

  afterUpdatedDate: z.string().datetime().optional().describe("Filter bookings updated after this date"),

  beforeUpdatedDate: z.string().datetime().optional().describe("Filter bookings updated before this date"),

  afterCreatedDate: z.string().datetime().optional().describe("Filter bookings created after this date"),

  beforeCreatedDate: z.string().datetime().optional().describe("Filter bookings created before this date"),

  sortStart: z.enum(["asc", "desc"]).optional().describe("Sort by booking start time"),

  sortEnd: z.enum(["asc", "desc"]).optional().describe("Sort by booking end time"),

  sortCreated: z.enum(["asc", "desc"]).optional().describe("Sort by booking creation time"),

  sortUpdated: z.enum(["asc", "desc"]).optional().describe("Sort by booking update time"),

  page: z.number().int().positive().default(1).describe("Page number (default: 1)"),

  limit: z
    .number()
    .int()
    .positive()
    .max(500)
    .default(100)
    .describe("Number of results per page (default: 100)"),
});

// Type inference
export type GetBookingsInput = z.infer<typeof bookingsQueryRequestSchema>;

// ---------------------------------------------
// Create Booking (body & response) schemas
// ---------------------------------------------

const nameObjectSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const createBookingBodySchema = z
  .object({
    // Event type identification (required: either ID or slug)
    eventTypeId: z.number().int().positive().optional().describe("Unique identifier for the event type"),
    eventTypeSlug: z.string().min(1).optional().describe("URL-friendly slug for the event type"),

    // Booking time (required) - accepts timezone-aware format
    start: z
      .string()
      .datetime({ offset: true })
      .describe("Booking start time (ISO 8601, e.g., '2025-10-09T14:30:00+05:30')"),
    end: z
      .string()
      .datetime({ offset: true })
      .describe("Booking end time (ISO 8601, e.g., '2025-10-09T15:00:00+05:30')"),
    timeZone: z
      .string()
      .describe("IANA timezone identifier (e.g., 'Asia/Calcutta', 'America/New_York')")
      .default("Asia/Kolkata"),

    // Responses object containing attendee information (required)
    responses: z
      .object({
        name: z
          .union([z.string().min(1), nameObjectSchema])
          .default("John Doe")
          .describe("Booker's full name or name object with firstName/lastName"),
        email: z.string().email().describe("Booker's email address"),

        // Location can be either a string OR an object with value/optionValue
        location: z
          .union([
            z.string(),
            z.object({
              value: z.string(),
              optionValue: z.string(),
            }),
          ])
          .default({
            value: "integrations:google:meet",
            optionValue: "",
          })
          .describe(
            "Meeting location - string like 'integrations:google:meet' or object with value/optionValue"
          ),

        // Optional response fields
        phone: z.string().optional().describe("Booker's phone number").default("+91XXXXXXXXXX"),
        guests: z.array(z.string().email()).optional().default([]).describe("Array of guest email addresses"),
        notes: z.string().optional().describe("Additional notes or comments from the booker"),
      })
      .describe("Booking form responses containing attendee details")
      .passthrough(),

    // User/team identification
    // user: z.string().optional().describe("Username for the booking (e.g., 'john doe')"),

    // Language & locale
    language: z
      .string()
      .optional()
      .default("en")
      .describe("Language code for email communications (e.g., 'en', 'es', 'fr')"),

    // Metadata
    metadata: z.record(z.any()).optional().default({}).describe("Additional metadata for the booking"),

    // Optional fields
    // hasHashedBookingLink: z.boolean().optional().default(false),
    // routedTeamMemberIds: z.array(z.number()).nullable().optional().default(null),
    // skipContactOwner: z.boolean().optional().default(false),
    // _isDryRun: z.boolean().optional().default(false),
    // dub_id: z.string().nullable().optional().default(null),
    // CreationSource: z.enum(["API"]).optional().default("API"),

    // Deprecated but still supported
    // guests: z
    //   .array(z.string().email())
    //   .optional()
    //   .default([])
    //   .describe("Deprecated: Use responses.guests instead"),
  })
  .strict()
  .refine((data) => Boolean(data.eventTypeId) || Boolean(data.eventTypeSlug), {
    message: "Either eventTypeId or eventTypeSlug is required",
    path: ["eventTypeId"],
  })
  .refine((data) => data.responses?.email && data.responses?.name, {
    message: "Responses object must contain both email and name",
    path: ["responses"],
  });

export type CreateBookingBody = z.infer<typeof createBookingBodySchema>;

export const bookingResponseSchema = z
  .object({
    id: z.number().int().optional(),
    uid: z.string().optional(),
    userId: z.number().int().optional(),
    status: BookingStatus.optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    paymentRequired: z.boolean().optional(),
    paymentUid: z.string().optional(),
    paymentId: z.number().int().optional(),
    isDryRun: z.boolean().optional(),
    // pass-through for extra fields
  })
  .catchall(z.any());

// ---------------------------------------------
// Read Booking by ID (params & response) schemas
// ---------------------------------------------

export const getBookingParamsSchema = z.object({
  id: z.union([z.string().transform((v) => parseInt(v, 10)), z.number()]).pipe(z.number().int().positive()),
  expand: z
    .union([z.string().transform((val) => val.split(",").map((s) => s.trim())), z.array(z.string())])
    .optional(),
});

export type GetBookingParams = z.infer<typeof getBookingParamsSchema>;

export const bookingReadPublicSchema = z.object({}).catchall(z.any());

// ---------------------------------------------
// Delete Booking by ID (params & response) schemas
// ---------------------------------------------

export const deleteBookingParamsSchema = z.object({
  id: z.union([z.string().transform((v) => parseInt(v, 10)), z.number()]).pipe(z.number().int().positive()),
});

export type DeleteBookingParams = z.infer<typeof deleteBookingParamsSchema>;

// ---------------------------------------------
// Cancel Booking (body & response) schemas
// ---------------------------------------------

export const cancelBookingParamsSchema = z.object({
  id: z.number().int().positive(),
});

// Body schema matching handleCancelBooking
export const cancelBookingBodySchema = z
  .object({
    uid: z.string().optional(),
    allRemainingBookings: z.boolean().optional(),
    cancelSubsequentBookings: z.boolean().optional(),
    cancellationReason: z.string().optional().default("Not Provided"),
    seatReferenceUid: z.string().optional(),
    cancelledBy: z.string().email({ message: "Invalid email" }).optional(),
    internalNote: z
      .union([
        z.object({
          id: z.number(),
          name: z.string(),
          cancellationReason: z.string().optional().nullable(),
        }),
        z.null(),
      ])
      .optional(),
    autoRefund: z.boolean().optional().default(false),
  })
  .strict();

export type CancelBookingBody = z.infer<typeof cancelBookingBodySchema>;

export const cancelBookingResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  onlyRemovedAttendee: z.boolean(),
  bookingId: z.number().int(),
  bookingUid: z.string(),
});

const locationOptionSchema = z.object({
  value: z.string(),
  optionValue: z.string(),
});

const responsesSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  guests: z.array(z.unknown()),
  location: locationOptionSchema.optional(),
});

const bookingStatusEnum = z.enum(["ACCEPTED", "CANCELLED", "REJECTED", "PENDING", "AWAITING_HOST"]);

const schedulingTypeEnum = z.enum(["ROUND_ROBIN", "COLLECTIVE", "MANAGED"]);

const hostSchema = z.object({
  user: z
    .object({
      id: z.number().optional(),
      email: z.string().email(),
    })
    .nullable(),
});

const calIdTeamSchema = z
  .object({
    id: z.number().optional(),
    name: z.string(),
    slug: z.string(),
  })
  .nullable();

const eventTypeColorSchema = z.object({
  darkEventTypeColor: z.string().optional().nullable(),
  lightEventTypeColor: z.string().optional().nullable(),
});

const eventTypeSchema = z.object({
  id: z.number().optional(),
  title: z.string().optional(),
  slug: z.string().optional(),
  eventName: z.string().optional(),
  price: z.number().optional(),
  currency: z.string().optional(),
  recurringEvent: z.any(),
  metadata: z.record(z.unknown()).optional(),
  schedulingType: schedulingTypeEnum.optional(),
  seatsShowAttendees: z.boolean().optional(),
  hosts: z.array(hostSchema).optional(),
  calIdTeam: calIdTeamSchema.optional(),
  length: z.number().optional(),
  customReplyToEmail: z.string().nullable().optional(),
  allowReschedulingPastBookings: z.boolean().optional(),
  hideOrganizerEmail: z.boolean().optional(),
  disableCancelling: z.boolean().optional(),
  disableRescheduling: z.boolean().optional(),
  eventTypeColor: z.any().nullable().optional(),
});

const userSchema = z.object({
  id: z.number().optional(),
  name: z.string().nullable(),
  email: z.string().email(),
});

const attendeeSchema = z.object({
  email: z.string().email(),
  name: z.string().nullable().optional(),
});

export const bookingsQueryResponseSchema = z.object({
  id: z.number(),
  title: z.string().nullable(),
  userPrimaryEmail: z.string().email(),
  description: z.string().nullable(),
  customInputs: z.record(z.unknown()).nullable(),
  startTime: z.string(), // ISO string
  endTime: z.string(), // ISO string
  createdAt: z.string(),
  updatedAt: z.string(),
  metadata: z.record(z.unknown()).nullable(),
  uid: z.string(),
  responses: z.any().nullable(),
  // responsesSchema,
  recurringEventId: z.string().nullable(),
  location: z.string().nullable().optional(),
  status: bookingStatusEnum,
  paid: z.boolean(),
  fromReschedule: z.string().nullable().optional(),
  rescheduled: z.boolean().nullable().optional(),
  isRecorded: z.boolean(),
  routedFromRoutingFormReponse: z.any().nullable().optional(),
  eventType: eventTypeSchema.optional(),
  references: z.array(z.any()),
  payment: z.array(z.any()),
  user: userSchema.optional(),
  attendees: z.array(z.any()),
  // attendeesWithSeats: z.array(z.any()),
  seatsReferences: z.array(z.any()),
  assignmentReason: z.array(z.any()),
  rescheduler: z.string().nullable().optional(),
});

const paymentSchema = z.object({
  id: z.number(),
  paymentOption: z.string().nullable(),
  amount: z.number(),
  currency: z.string(),
  success: z.boolean(),
});

export const singleBookingQueryResponseSchema = z.object({
  id: z.number(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  customInputs: z.record(z.unknown()).nullable().optional(),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  metadata: z.record(z.unknown()).nullable().optional(),
  uid: z.string().nullable(),
  recurringEventId: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  paid: z.boolean().optional(),
  fromReschedule: z.string().nullable().optional(),
  rescheduled: z.boolean().nullable().optional(),
  isRecorded: z.boolean().optional(),
  eventType: eventTypeSchema.optional(),
  user: userSchema.optional(),
  attendees: z.array(attendeeSchema).optional(),
  payment: z.array(paymentSchema).optional(),
});
