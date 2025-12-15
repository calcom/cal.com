/**
 * Query Hooks Index
 *
 * Central export point for all React Query hooks.
 * Import hooks from this file for clean imports:
 *
 * @example
 * ```tsx
 * import { useBookings, useEventTypes, useSchedules } from '../hooks';
 * ```
 */

// Bookings hooks
export {
  useBookings,
  useBookingByUid,
  useCancelBooking,
  useRescheduleBooking,
  useConfirmBooking,
  useDeclineBooking,
  usePrefetchBookings,
  useInvalidateBookings,
  type BookingFilters,
  type Booking,
} from "./useBookings";

// Event Types hooks
export {
  useEventTypes,
  useEventTypeById,
  useCreateEventType,
  useUpdateEventType,
  useDeleteEventType,
  useDuplicateEventType,
  usePrefetchEventTypes,
  useInvalidateEventTypes,
  type EventType,
  type CreateEventTypeInput,
} from "./useEventTypes";

// Schedules (Availability) hooks
export {
  useSchedules,
  useScheduleById,
  useCreateSchedule,
  useUpdateSchedule,
  useSetScheduleAsDefault,
  useDeleteSchedule,
  useDuplicateSchedule,
  usePrefetchSchedules,
  useInvalidateSchedules,
  type Schedule,
  type CreateScheduleInput,
  type UpdateScheduleInput,
} from "./useSchedules";

// User Profile hooks
export {
  useUserProfile,
  useUsername,
  useUpdateUserProfile,
  usePrefetchUserProfile,
  useInvalidateUserProfile,
  type UserProfile,
  type UpdateUserProfileInput,
} from "./useUserProfile";

// Re-export query keys for advanced use cases
export { queryKeys } from "../config/cache.config";

// Re-export query context utilities
export { useQueryContext } from "../contexts/QueryContext";
