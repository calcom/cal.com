// Utility functions for prompt display and restoration

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

  const restoredPrompt = prompt
    .replace(/\bcheck_availability\b/g, "check_availability_{{eventTypeId}}")
    .replace(/\bbook_appointment\b/g, "book_appointment_{{eventTypeId}}");

  return restoredPrompt;
};
