/**
 * Event Type DTOs - Data Transfer Objects for event type data
 */

import type { JsonValue } from "@calcom/types/JsonObject";

import type { TeamSummaryDto } from "./TeamDto";
import type { WorkflowOnEventTypeDto } from "./WorkflowDto";

/**
 * Event type with team for booking context
 */
export interface EventTypeWithTeamDto {
  team: TeamSummaryDto | null;
  metadata: JsonValue;
  title: string;
  recurringEvent: JsonValue;
  seatsPerTimeSlot: number | null;
  seatsShowAttendees: boolean | null;
  hideOrganizerEmail: boolean;
  customReplyToEmail: string | null;
}

/**
 * Parent event type reference
 */
export interface ParentEventTypeDto {
  teamId: number | null;
}

/**
 * Event type owner information
 */
export interface EventTypeOwnerDto {
  id: number;
  hideBranding: boolean;
}

/**
 * Event type information for confirmation flow
 */
export interface EventTypeForConfirmationDto {
  id: number;
  owner: EventTypeOwnerDto | null;
  teamId: number | null;
  recurringEvent: JsonValue;
  title: string;
  slug: string;
  requiresConfirmation: boolean;
  currency: string;
  length: number;
  description: string | null;
  price: number;
  bookingFields: JsonValue;
  hideOrganizerEmail: boolean;
  hideCalendarNotes: boolean;
  hideCalendarEventDetails: boolean;
  disableGuests: boolean;
  customReplyToEmail: string | null;
  metadata: JsonValue;
  locations: JsonValue;
  team: TeamSummaryDto | null;
  workflows: WorkflowOnEventTypeDto[];
  customInputs: JsonValue;
  parentId: number | null;
  parent: ParentEventTypeDto | null;
}
