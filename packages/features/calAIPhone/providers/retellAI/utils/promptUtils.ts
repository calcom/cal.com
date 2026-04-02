// Utility functions for prompt display and restoration
import { RETELL_AI_TEST_EVENT_TYPE_MAP, RETELL_AI_TEST_MODE } from "@calcom/lib/constants";

export const cleanPromptForDisplay = (prompt: string): string => {
  if (!prompt) return prompt;

  const cleanedPrompt = prompt
    .replace(/check_availability_\{\{eventTypeId\}\}/g, "check_availability")
    .replace(/book_appointment_\{\{eventTypeId\}\}/g, "book_appointment")
    .replace(/check_availability_\d+/g, "check_availability")
    .replace(/book_appointment_\d+/g, "book_appointment");

  return cleanedPrompt;
};

export const restorePromptComplexity = (prompt: string): string => {
  if (!prompt) return prompt;

  return prompt
    .replace(/\bcheck_availability\b/g, "check_availability_{{eventTypeId}}")
    .replace(/\bbook_appointment\b/g, "book_appointment_{{eventTypeId}}");
};

/**
 * Replaces event type placeholders in a prompt with the actual event type ID
 * Handles both numeric placeholders (check_availability_123) and template placeholders (check_availability_{{eventTypeId}})
 */
export const replaceEventTypePlaceholders = (prompt: string, eventTypeId: number): string => {
  let eventTypeIdToUse = eventTypeId;
  if (RETELL_AI_TEST_MODE && RETELL_AI_TEST_EVENT_TYPE_MAP) {
    const mappedId = RETELL_AI_TEST_EVENT_TYPE_MAP[String(eventTypeId)];
    eventTypeIdToUse = mappedId ? Number(mappedId) : eventTypeId;
  }

  return prompt
    .replace(/check_availability_\d+/g, `check_availability_${eventTypeIdToUse}`)
    .replace(/book_appointment_\d+/g, `book_appointment_${eventTypeIdToUse}`)
    .replace(/check_availability_\{\{eventTypeId\}\}/g, `check_availability_${eventTypeIdToUse}`)
    .replace(/book_appointment_\{\{eventTypeId\}\}/g, `book_appointment_${eventTypeIdToUse}`);
};
