import { WorkflowActions, WorkflowTriggerEvents } from "@calcom/prisma/enums";

export function canDisableOrganizerNotifications(
  workflowSequence: {
    trigger: WorkflowTriggerEvents;
    steps: { action: WorkflowActions }[];
  }[]
) {
  const discoveredMatch = workflowSequence.find((flow) => {
    const triggeredByNewBooking = flow.trigger === WorkflowTriggerEvents.NEW_EVENT;
    if (!triggeredByNewBooking) return false;

    const includesOrganizerEmail = flow.steps.find(
      (operation) => operation.action === WorkflowActions.EMAIL_HOST
    );

    return !!includesOrganizerEmail;
  });

  return !!discoveredMatch;
}

export function canDisableParticipantNotifications(
  workflowSequence: {
    trigger: WorkflowTriggerEvents;
    steps: { action: WorkflowActions }[];
  }[]
) {
  const validConfiguration = workflowSequence.find((flowDefinition) => {
    const isNewBookingTrigger = flowDefinition.trigger === WorkflowTriggerEvents.NEW_EVENT;
    if (!isNewBookingTrigger) {
      return false;
    }

    const containsParticipantNotification = flowDefinition.steps.find((processingStep) => {
      const emailParticipant = processingStep.action === WorkflowActions.EMAIL_ATTENDEE;
      const textParticipant = processingStep.action === WorkflowActions.SMS_ATTENDEE;
      return emailParticipant || textParticipant;
    });

    return !!containsParticipantNotification;
  });

  return !!validConfiguration;
}
