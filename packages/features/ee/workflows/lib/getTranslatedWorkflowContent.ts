import prisma from "@calcom/prisma";
import { WorkflowStepTranslatedField } from "@calcom/prisma/enums";

/**
 * Fetches translated subject and body for a workflow step, falling back to empty strings.
 */
export async function getTranslatedWorkflowContent(args: { workflowStepId?: number; targetLocale?: string }) {
  const { workflowStepId, targetLocale } = args;

  if (!workflowStepId || !targetLocale) return { translatedSubject: "", translatedBody: "" };

  const translations = await prisma.workflowStepTranslation.findMany({
    where: {
      workflowStepId,
      targetLocale,
      field: {
        in: [WorkflowStepTranslatedField.WORKFLOW_SUBJECT, WorkflowStepTranslatedField.WORKFLOW_BODY],
      },
    },
  });

  if (!translations.length) return { translatedSubject: "", translatedBody: "" };

  const subjectTranslation = translations.find(
    (t) => t.field === WorkflowStepTranslatedField.WORKFLOW_SUBJECT
  );
  const bodyTranslation = translations.find((t) => t.field === WorkflowStepTranslatedField.WORKFLOW_BODY);

  return {
    translatedSubject: subjectTranslation?.translatedText ?? "",
    translatedBody: bodyTranslation?.translatedText ?? "",
  };
}
