/**
 * Phone Field Management System
 *
 * A well-architected system for managing phone fields in Cal.com bookings.
 * Uses clean abstractions, separation of concerns, and proper design patterns.
 *
 * Key Components:
 * - PhoneFieldService: Main orchestrator service
 * - PhoneNumber: Value object for phone number handling
 * - PhoneFieldResolver: Strategy pattern for field resolution
 * - PhoneFieldManager: Field manipulation operations
 * - PhoneBookingDetector: Business logic for phone booking detection
 * - PhoneNumberMapper: Response mapping utilities
 *
 * Usage:
 * ```typescript
 * import { phoneFieldService } from '@calcom/features/bookings/lib/phone-fields';
 *
 * // Consolidate phone fields
 * const consolidatedFields = phoneFieldService.consolidatePhoneFields(fields, workflows);
 *
 * // Extract phone number
 * const phoneNumber = phoneFieldService.extractPrimaryPhone(responses);
 *
 * // Map responses for backward compatibility
 * const mappedResponses = phoneFieldService.mapPhoneResponses(responses);
 * ```
 */

import { PhoneBookingDetector, PhoneNumberMapper, PhoneFieldManager } from "./PhoneFieldManager";

// Main service - primary API
export { phoneFieldService, PhoneFieldService } from "./PhoneFieldService";

// Core value objects and domain entities
export { PhoneNumber } from "./PhoneNumber";

// Individual services for advanced usage
export { PhoneFieldManager, PhoneBookingDetector, PhoneNumberMapper }
export { PhoneFieldResolver } from "./PhoneFieldResolver";

// Types and enums for external consumers
export {
  PhoneFieldStrategy
} from "./types";

export type {
  PhoneFieldContext,
  PhoneFieldResolution,
  PhoneRequirement,
  PhoneNumberSource,
  PhoneRequirementType,
  IPhoneFieldResolver,
  IPhoneNumberExtractor,
  IPhoneFieldManager
} from "./types";

// Utility functions for backward compatibility
export const isPhoneBasedBooking = (fields: import("@calcom/features/bookings/lib/getBookingFields").Fields) =>
  PhoneBookingDetector.isPhoneBasedBooking(fields);

export const extractPrimaryPhoneNumber = (responses: Record<string, unknown>) =>
  PhoneNumberMapper.extractPrimaryPhone(responses);

export const mapPhoneToLegacyFields = (responses: Record<string, unknown>) =>
  PhoneNumberMapper.mapToLegacyFields(responses);
