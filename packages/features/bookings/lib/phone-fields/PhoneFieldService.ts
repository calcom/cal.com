import type { WorkflowDataForBookingField } from "@calcom/features/ee/workflows/lib/getWorkflowActionOptions";
import type { Fields } from "@calcom/features/bookings/lib/getBookingFields";
import { PhoneFieldResolver } from "./PhoneFieldResolver";
import { PhoneFieldManager, PhoneBookingDetector, PhoneNumberMapper } from "./PhoneFieldManager";
import { PhoneNumber } from "./PhoneNumber";
import type { PhoneFieldContext, PhoneFieldResolution } from "./types";

/**
 * Main service that orchestrates phone field consolidation
 * Provides a clean API for all phone field operations
 */
export class PhoneFieldService {
  private readonly resolver = new PhoneFieldResolver();
  private readonly manager = new PhoneFieldManager();

  /**
   * Consolidates phone fields based on workflows and booking configuration
   */
  consolidatePhoneFields(
    fields: Fields,
    workflows: readonly WorkflowDataForBookingField[]
  ): Fields {
    const context = this.createContext(fields, workflows);
    const resolution = this.resolver.resolvePhoneField(context);
    
    return this.manager.consolidatePhoneFields(fields, resolution);
  }

  /**
   * Maps booking responses to ensure phone number compatibility
   */
  mapPhoneResponses(responses: Record<string, unknown>): Record<string, unknown> {
    return PhoneNumberMapper.mapToLegacyFields(responses);
  }

  /**
   * Extracts primary phone number from booking responses
   */
  extractPrimaryPhone(responses: Record<string, unknown>): PhoneNumber | null {
    return PhoneNumber.fromResponses(responses);
  }

  /**
   * Checks if event type uses phone-based booking
   */
  isPhoneBasedBooking(fields: Fields): boolean {
    return PhoneBookingDetector.isPhoneBasedBooking(fields);
  }

  /**
   * Checks if workflows require phone numbers
   */
  hasPhoneRequirements(workflows: readonly WorkflowDataForBookingField[]): boolean {
    return PhoneBookingDetector.hasWorkflowPhoneRequirements(workflows);
  }

  /**
   * Gets phone field resolution for debugging/testing
   */
  resolvePhoneField(
    fields: Fields,
    workflows: readonly WorkflowDataForBookingField[]
  ): PhoneFieldResolution {
    const context = this.createContext(fields, workflows);
    return this.resolver.resolvePhoneField(context);
  }

  /**
   * Handles FormBuilder phone toggle by using unified field when workflows are present
   */
  handlePhoneToggle(
    fields: Fields,
    workflows: readonly WorkflowDataForBookingField[],
    toggleValue: "email" | "phone"
  ): Fields {
    const hasWorkflowPhoneRequirements = this.hasPhoneRequirements(workflows);
    
    if (toggleValue === "phone") {
      let updatedFields: Fields;
      
      if (hasWorkflowPhoneRequirements) {
        // Use unified phone field when workflows are present
        updatedFields = this.consolidatePhoneFields(fields, workflows);
      } else {
        // Use standard attendeePhoneNumber for phone-based booking without workflows
        updatedFields = [...fields];
        const phoneFieldIndex = updatedFields.findIndex(f => f.name === "attendeePhoneNumber");
        const emailFieldIndex = updatedFields.findIndex(f => f.name === "email");
        
        if (phoneFieldIndex !== -1) {
          updatedFields[phoneFieldIndex] = {
            ...updatedFields[phoneFieldIndex],
            hidden: false,
            required: true,
          };
        }
        
        if (emailFieldIndex !== -1) {
          updatedFields[emailFieldIndex] = {
            ...updatedFields[emailFieldIndex],
            hidden: true,
            required: false,
          };
        }
      }
      
      // Always hide email field when phone toggle is selected
      const emailFieldIndex = updatedFields.findIndex(f => f.name === "email");
      if (emailFieldIndex !== -1) {
        updatedFields = [...updatedFields];
        updatedFields[emailFieldIndex] = {
          ...updatedFields[emailFieldIndex],
          hidden: true,
          required: false,
        };
      }
      
      return updatedFields;
    }
    
    // Default behavior for other toggle values
    return fields;
  }

  private createContext(
    fields: Fields,
    workflows: readonly WorkflowDataForBookingField[]
  ): PhoneFieldContext {
    return {
      workflows,
      existingFields: fields,
      isPhoneBasedBooking: PhoneBookingDetector.isPhoneBasedBooking(fields)
    };
  }
}

// Export singleton instance for convenient usage
export const phoneFieldService = new PhoneFieldService();

// Export individual components for advanced usage
export {
  PhoneFieldResolver,
  PhoneFieldManager,
  PhoneBookingDetector,
  PhoneNumberMapper,
  PhoneNumber
};

// Export types for external consumers
export type {
  PhoneFieldContext,
  PhoneFieldResolution,
  PhoneRequirement,
  PhoneFieldStrategy,
  PhoneNumberSource
} from "./types";