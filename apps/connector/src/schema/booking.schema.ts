import { z } from 'zod';

// Enums (you'll need to define these based on your existing enums)
const Status = z.enum(['upcoming', 'recurring', 'past', 'cancelled', 'unconfirmed']);
const SortOrder = z.enum(['asc', 'desc']);
const BookingStatus = z.enum(["PENDING", "ACCEPTED", "CANCELLED", "REJECTED"]);

// Custom transform for comma-separated strings to arrays
const commaStringToArray = (transform: (item: string) => any) => 
  z.union([
    z.string().transform((val) => val.split(',').map((item) => transform(item.trim()))),
    z.array(z.any()).transform((val) => val.map(transform))
  ]);

// Custom transform for comma-separated numbers
const commaStringToNumberArray = commaStringToArray((item) => {
  const num = typeof item === 'string' ? parseInt(item) : +item;
  if (isNaN(num)) throw new Error('Invalid number');
  return num;
});

// Custom transform for attendee email (replaces spaces with +)
const attendeeEmailTransform = z.string().transform((val) => 
  val.trim().replace(/\s+/g, '+')
);

export const bookingsQuerySchema = z.object({
  // Filters
  status: z.union([
    z.string().transform((val) => val.split(',').map((status) => status.trim())),
    z.array(z.string())
  ]).pipe(
    z.array(Status).min(1, "status cannot be empty.")
  ).optional(),

  attendeeEmail: attendeeEmailTransform.optional(),

  attendeeName: z.string().optional(),

  bookingUid: z.string().optional(),

  eventTypeIds: commaStringToNumberArray
    .pipe(z.array(z.number()).min(1, "eventTypeIds must contain at least 1 event type id"))
    .optional(),


  teamsIds: commaStringToNumberArray
    .pipe(z.array(z.number()).min(1, "teamIds must contain at least 1 team id"))
    .optional(),

  // Date filters (ISO 8601 strings)
  afterStart: z.string().datetime({ message: "afterStart must be a valid ISO 8601 date." }).optional(),

  beforeEnd: z.string().datetime({ message: "beforeEnd must be a valid ISO 8601 date." }).optional(),

  afterCreatedAt: z.string().datetime({ message: "afterCreatedAt must be a valid ISO 8601 date." }).optional(),

  beforeCreatedAt: z.string().datetime({ message: "beforeCreatedAt must be a valid ISO 8601 date." }).optional(),

  afterUpdatedAt: z.string().datetime({ message: "afterUpdatedAt must be a valid ISO 8601 date." }).optional(),

  beforeUpdatedAt: z.string().datetime({ message: "beforeUpdatedAt must be a valid ISO 8601 date." }).optional(),

  // Sort options
  sortStart: SortOrder.optional(),

  sortEnd: SortOrder.optional(),

  sortCreated: SortOrder.optional(),

  sortUpdatedAt: SortOrder.optional(),

  // Pagination
  take: z.union([
    z.string().transform((val) => parseInt(val)),
    z.number()
  ]).pipe(
    z.number().int().min(1).max(250)
  ).default(100).optional(),

  skip: z.union([
    z.string().transform((val) => parseInt(val)),
    z.number()
  ]).pipe(
    z.number().int().min(0)
  ).default(0).optional(),
});

// Type inference
export type GetBookingsInput = z.infer<typeof bookingsQuerySchema>;

// ---------------------------------------------
// Create Booking (body & response) schemas
// ---------------------------------------------

const nameObjectSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const createBookingBodySchema = z.object({
  eventTypeId: z.number().int().positive().optional(),
  eventTypeSlug: z.string().min(1).optional(),

  start: z.string().min(1),
  end: z.string().min(1),
  timeZone: z.string().min(1),

  email: z.string().email().optional(),
  name: z.union([z.string().min(1), nameObjectSchema]).optional(),
  attendeePhoneNumber: z.string().min(1).optional(),
  language: z.string().optional(),

  guests: z.array(z.string().email()).optional(),

  location: z.string().optional(),
  notes: z.string().optional(),
  noEmail: z.boolean().optional(),

  teamMemberEmail: z.string().email().optional(),
  routedTeamMemberIds: z.array(z.number().int()).optional(),
  routingFormResponseId: z.number().int().optional(),

  rescheduleUid: z.string().optional(),
  rescheduleReason: z.string().optional(),

  recurringEventId: z.string().optional(),
  recurringCount: z.number().int().positive().optional(),

  responses: z.record(z.any()).optional(),
  calEventResponses: z.record(z.any()).optional(),
  calEventUserFieldsResponses: z.record(z.any()).optional(),

  _isDryRun: z.boolean().optional(),
  _shouldServeCache: z.boolean().optional(),

  tracking: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
  bookingUid: z.string().optional(),
  orgSlug: z.string().optional(),
  locationUrl: z.string().url().optional(),
  platformRescheduleUrl: z.string().url().optional(),
  platformCancelUrl: z.string().url().optional(),
  platformBookingUrl: z.string().url().optional(),
}).refine((data) => Boolean(data.eventTypeId) || Boolean(data.eventTypeSlug), {
  message: "Either eventTypeId or eventTypeSlug is required",
  path: ["eventTypeId"],
});

export type CreateBookingBody = z.infer<typeof createBookingBodySchema>;

export const bookingResponseSchema = z.object({
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
}).catchall(z.any());

// ---------------------------------------------
// Read Booking by ID (params & response) schemas
// ---------------------------------------------

export const getBookingParamsSchema = z.object({
  id: z
    .union([z.string().transform((v) => parseInt(v, 10)), z.number()])
    .pipe(z.number().int().positive()),
  expand: z
    .union([
      z.string().transform((val) => val.split(',').map((s) => s.trim())),
      z.array(z.string()),
    ])
    .optional(),
});

export type GetBookingParams = z.infer<typeof getBookingParamsSchema>;

export const bookingReadPublicSchema = z.object({}).catchall(z.any());

// ---------------------------------------------
// Delete Booking by ID (params & response) schemas
// ---------------------------------------------

export const deleteBookingParamsSchema = z.object({
  id: z
    .union([z.string().transform((v) => parseInt(v, 10)), z.number()])
    .pipe(z.number().int().positive()),
});

export type DeleteBookingParams = z.infer<typeof deleteBookingParamsSchema>;

// ---------------------------------------------
// Cancel Booking (body & response) schemas
// ---------------------------------------------

export const cancelBookingBodySchema = z
  .object({
    uid: z.string().optional(),
    allRemainingBookings: z.boolean().optional(),
    cancelSubsequentBookings: z.boolean().optional(),
    cancellationReason: z.string().optional().default('Not Provided'),
    seatReferenceUid: z.string().optional(),
    cancelledBy: z.string().email({ message: 'Invalid email' }).optional(),
    internalNote: z
      .object({
        id: z.number(),
        name: z.string(),
        cancellationReason: z.string().optional().nullable(),
      })
      .optional()
      .nullable(),
    autoRefund: z.boolean().optional(),
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
