import type { SchedulingType, PeriodType } from "@calcom/prisma/enums";

/**
 * ORM-agnostic interface for EventTypeRepository
 * This interface defines the contract for event type data access
 * Implementations can use Prisma, Kysely, or any other data access layer
 */

export interface EventTypeDto {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  length: number;
  hidden: boolean;
  userId: number | null;
  teamId: number | null;
  profileId: number | null;
  parentId: number | null;
  scheduleId: number | null;
  schedulingType: SchedulingType | null;
  periodType: PeriodType;
  periodDays: number | null;
  periodStartDate: Date | null;
  periodEndDate: Date | null;
  periodCountCalendarDays: boolean | null;
  requiresConfirmation: boolean;
  disableGuests: boolean;
  minimumBookingNotice: number;
  beforeEventBuffer: number;
  afterEventBuffer: number;
  slotInterval: number | null;
  metadata: unknown;
  seatsPerTimeSlot: number | null;
  price: number;
  currency: string;
  position: number;
  successRedirectUrl: string | null;
  forwardParamsSuccessRedirect: boolean | null;
  timeZone: string | null;
  eventName: string | null;
  recurringEvent: unknown;
  bookingLimits: unknown;
  durationLimits: unknown;
  locations: unknown;
  customInputs: unknown;
  bookingFields: unknown;
}

export interface EventTypeCreateInputDto {
  title: string;
  slug: string;
  length: number;
  description?: string | null;
  hidden?: boolean;
  userId?: number | null;
  teamId?: number | null;
  profileId?: number | null;
  parentId?: number | null;
  scheduleId?: number | null;
  schedulingType?: SchedulingType | null;
  periodType?: PeriodType;
  periodDays?: number | null;
  periodStartDate?: Date | null;
  periodEndDate?: Date | null;
  periodCountCalendarDays?: boolean | null;
  requiresConfirmation?: boolean;
  disableGuests?: boolean;
  minimumBookingNotice?: number;
  beforeEventBuffer?: number;
  afterEventBuffer?: number;
  slotInterval?: number | null;
  metadata?: unknown;
  seatsPerTimeSlot?: number | null;
  price?: number;
  currency?: string;
  position?: number;
  successRedirectUrl?: string | null;
  forwardParamsSuccessRedirect?: boolean | null;
  timeZone?: string | null;
  eventName?: string | null;
  recurringEvent?: unknown;
  bookingLimits?: unknown;
  durationLimits?: unknown;
  locations?: unknown;
  customInputs?: unknown;
  bookingFields?: unknown;
}

export interface EventTypeWithHostsDto extends EventTypeDto {
  hosts: Array<{
    userId: number;
    isFixed: boolean;
    priority: number | null;
    weight: number | null;
    scheduleId: number | null;
  }>;
}

export interface EventTypeWithTeamDto extends EventTypeDto {
  team: {
    id: number;
    name: string;
    slug: string | null;
    parentId: number | null;
  } | null;
}

export interface IEventTypeRepository {
  /**
   * Create a new event type
   */
  create(data: EventTypeCreateInputDto): Promise<EventTypeDto>;

  /**
   * Find event type by ID
   */
  findById(id: number): Promise<EventTypeDto | null>;

  /**
   * Find event type by ID with minimal data
   */
  findByIdMinimal(id: number): Promise<{ id: number; slug: string; title: string } | null>;

  /**
   * Find event type title by ID
   */
  findTitleById(id: number): Promise<{ title: string } | null>;

  /**
   * Find all event types by user ID
   */
  findAllByUserId(userId: number): Promise<EventTypeDto[]>;

  /**
   * Find first event type ID for a user
   */
  findFirstEventTypeId(userId: number): Promise<number | null>;

  /**
   * Get team ID by event type ID
   */
  getTeamIdByEventTypeId(eventTypeId: number): Promise<number | null>;

  /**
   * Find event type by ID with parent
   */
  findByIdWithParent(id: number): Promise<(EventTypeDto & { parent: { id: number; teamId: number | null } | null }) | null>;

  /**
   * Find event types by team ID
   */
  findAllByTeamId(teamId: number): Promise<EventTypeDto[]>;

  /**
   * Find event types without children (for a user)
   */
  findEventTypesWithoutChildren(userId: number): Promise<EventTypeDto[]>;

  /**
   * Find all event types including children by user ID
   */
  findAllIncludingChildrenByUserId(userId: number): Promise<EventTypeDto[]>;

  /**
   * Find all event types including children by team ID
   */
  findAllIncludingChildrenByTeamId(teamId: number): Promise<EventTypeDto[]>;

  /**
   * Find child event types by parent ID
   */
  findManyChildEventTypes(parentId: number): Promise<EventTypeDto[]>;
}
