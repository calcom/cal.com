import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { RoutingFormResponseRepository } from "@calcom/lib/server/repository/formResponse";
import prisma from "@calcom/prisma";
import type { FORM_SUBMITTED_WEBHOOK_RESPONSES } from "@calcom/routing-forms/lib/formSubmissionUtils";

export interface ValidationOptions {
  responseId: number;
  formId: string;
  responses: FORM_SUBMITTED_WEBHOOK_RESPONSES;
  submittedAt?: Date;
}

export interface ValidationResult {
  skip: boolean;
  reason?: string;
}

/**
 * Check if trigger should be skipped due to booking creation or duplicate submission
 */
export async function shouldTriggerFormSubmittedNoEvent(options: ValidationOptions) {
  const { formId, responseId, responses, submittedAt } = options;

  const bookingRepository = new BookingRepository(prisma);

  // Check if a booking was created from this form response
  const bookingFromResponse = await bookingRepository.findFirstBookingFromResponse({ responseId });

  if (bookingFromResponse) return false;

  // Check for duplicate form submissions
  const hasDuplicate = await hasDuplicateSubmission({ formId, responseId, responses, submittedAt });
  if (hasDuplicate) {
    return false;
  }

  return true;
}

export function getSubmitterEmail(responses: FORM_SUBMITTED_WEBHOOK_RESPONSES): string | undefined {
  const submitterEmail = Object.values(responses).find((response) => {
    const value = typeof response === "object" && response && "value" in response ? response.value : response;
    return typeof value === "string" && value.includes("@");
  })?.value;
  if (typeof submitterEmail !== "string") return undefined;
  return submitterEmail;
}

/**
 * Extracts the submitter's name from form responses.
 * Looks for fields with identifiers "name", "firstName", or "lastName" in that order of preference.
 */
export function getSubmitterName(responses: FORM_SUBMITTED_WEBHOOK_RESPONSES) {
  const nameField = responses?.name || responses?.firstName || responses?.lastName;

  if (nameField && typeof nameField === "object") {
    // Try the new response property first, then fall back to value
    if (typeof nameField.response === "string") {
      return nameField.response;
    }
    if (typeof nameField.value === "string") {
      return nameField.value;
    }
  }
}

/**
 * Check for duplicate form submissions within the last 60 minutes
 */
async function hasDuplicateSubmission({
  formId,
  responses,
  responseId,
  submittedAt,
}: {
  formId: string;
  responses: FORM_SUBMITTED_WEBHOOK_RESPONSES;
  responseId: number;
  submittedAt?: Date;
}): Promise<boolean> {
  const submitterEmail = getSubmitterEmail(responses);

  if (!submitterEmail) return false;

  const date = submittedAt ?? new Date();
  const formResponseRepository = new RoutingFormResponseRepository(prisma);

  const sixtyMinutesAgo = new Date(date.getTime() - 60 * 60 * 1000);

  const recentResponses = await formResponseRepository.findAllResponsesWithBooking({
    formId,
    responseId,
    createdAfter: sixtyMinutesAgo,
    createdBefore: new Date(),
  });

  // Check if there's a duplicate email in recent responses
  return recentResponses.some((response) => {
    if (!response.response || typeof response.response !== "object") return false;

    return Object.values(response.response as Record<string, { value: string; label: string }>).some(
      (field) => {
        return (
          typeof field === "object" &&
          field &&
          "value" in field &&
          typeof field.value === "string" &&
          field.value.toLowerCase() === submitterEmail.toLowerCase()
        );
      }
    );
  });
}
