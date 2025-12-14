/**
 * Booking Domain DTOs - Re-export all DTOs for convenient imports
 */

// Attendee DTOs
export type { AttendeeDto } from "./AttendeeDto";

// Booking DTOs
export type {
  BookingBasicDto,
  BookingInstantLocationDto,
  BookingExistsDto,
  BookingFullContextDto,
  BookingForConfirmationDto,
  BookingUpdateResultDto,
  BookingBatchUpdateResultDto,
  UpdateLocationInput,
} from "./BookingDto";

// Booking Reference DTOs
export type { BookingReferenceDto, BookingReferenceCreateInput } from "./BookingReferenceDto";

// Credential DTOs
export type { CredentialDto } from "./CredentialDto";

// Destination Calendar DTOs
export type { DestinationCalendarDto } from "./DestinationCalendarDto";

// Event Type DTOs
export type {
  EventTypeWithTeamDto,
  ParentEventTypeDto,
  EventTypeOwnerDto,
  EventTypeForConfirmationDto,
} from "./EventTypeDto";

// Payment DTOs
export type { PaymentDto } from "./PaymentDto";

// Team DTOs
export type { TeamSummaryDto } from "./TeamDto";

// User DTOs
export type { UserProfileDto, BookingUserDto, BookingConfirmationUserDto } from "./UserDto";

// Workflow DTOs
export type { WorkflowStepDto, WorkflowDto, WorkflowOnEventTypeDto } from "./WorkflowDto";
