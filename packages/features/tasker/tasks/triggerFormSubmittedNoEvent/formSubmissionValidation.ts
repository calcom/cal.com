import prisma from "@calcom/prisma";

export interface ValidationOptions {
  responseId: number;
  formId: string;
  responses: any;
}

export interface ValidationResult {
  skip: boolean;
  reason?: string;
}

/**
 * Check if trigger should be skipped due to booking creation or duplicate submission
 */
export async function shouldTriggerFormSubmittedNoEvent(options: ValidationOptions) {
  const { formId, responseId, responses } = options;

  // Check if a booking was created from this form response
  const bookingExists = await hasBooking(responseId);

  if (bookingExists) return false;

  // Check for duplicate form submissions
  const hasDuplicate = await hasDuplicateSubmission(formId, responseId, responses);
  if (hasDuplicate) {
    return false;
  }

  return true;
}

/**
 * Check if a booking was created from this form response
 */
async function hasBooking(responseId: number): Promise<boolean> {
  const bookingFromResponse = await prisma.booking.findFirst({
    where: {
      routedFromRoutingFormReponse: {
        id: responseId,
      },
    },
  });

  return !!bookingFromResponse;
}

/**
 * Check for duplicate form submissions within the last 60 minutes
 */
async function hasDuplicateSubmission(formId: string, responses: any, responseId?: number): Promise<boolean> {
  const submitterEmail = Object.values(responses).find(
    (response): response is { value: string; label: string } => {
      const value =
        typeof response === "object" && response && "value" in response ? response.value : response;
      return typeof value === "string" && value.includes("@");
    }
  )?.value;

  if (!submitterEmail) return false;

  const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000); //todo: this should actually check from the time of the form submission not just 60 munutes from now

  const recentResponses = await prisma.app_RoutingForms_FormResponse.findMany({
    where: {
      formId,
      createdAt: {
        gte: sixtyMinutesAgo,
        lt: new Date(),
      },
      routedToBookingUid: {
        not: null,
      },
      ...(responseId && { NOT: { id: responseId } }),
    },
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
