import { WorkflowTemplates } from "@calcom/prisma/enums";

import compareReminderBodyToTemplate from "./compareReminderBodyToTemplate";

export type DefaultTemplates = {
  reminder: { body: string | null; subject: string | null };
  rating: { body: string | null; subject: string | null };
};

export type DetectMatchedTemplateParams = {
  emailBody: string;
  emailSubject: string;
  template?: WorkflowTemplates;
  defaultTemplates: DefaultTemplates;
};

/**
 * Detects if the email body and subject match a default template (REMINDER or RATING).
 *
 * Logic:
 * 1. If emailBody is empty but template is specified as REMINDER or RATING, return that template
 * 2. If emailBody exists, check if both body AND subject match the REMINDER default template
 * 3. If not matched, check if both body AND subject match the RATING default template
 * 4. Return null if no match (indicating custom content that should be preserved)
 *
 * This is used to determine whether to regenerate the template with the recipient's locale
 * for proper translation, or to preserve user customizations.
 */
export function detectMatchedTemplate({
  emailBody,
  emailSubject,
  template,
  defaultTemplates,
}: DetectMatchedTemplateParams): WorkflowTemplates | null {
  if (!emailBody && template === WorkflowTemplates.REMINDER) {
    return WorkflowTemplates.REMINDER;
  }

  if (!emailBody && template === WorkflowTemplates.RATING) {
    return WorkflowTemplates.RATING;
  }

  if (emailBody) {
    const { reminder, rating } = defaultTemplates;

    const bodyMatchesReminder =
      reminder.body && compareReminderBodyToTemplate({ reminderBody: emailBody, template: reminder.body });
    const subjectMatchesReminder = reminder.subject && emailSubject === reminder.subject;

    if (bodyMatchesReminder && subjectMatchesReminder) {
      return WorkflowTemplates.REMINDER;
    }

    const bodyMatchesRating =
      rating.body && compareReminderBodyToTemplate({ reminderBody: emailBody, template: rating.body });
    const subjectMatchesRating = rating.subject && emailSubject === rating.subject;

    if (bodyMatchesRating && subjectMatchesRating) {
      return WorkflowTemplates.RATING;
    }
  }

  return null;
}
