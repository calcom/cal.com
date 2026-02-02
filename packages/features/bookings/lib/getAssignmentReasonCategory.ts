import { AssignmentReasonEnum } from "@calcom/prisma/enums";

/**
 * Maps an AssignmentReasonEnum to a translation key for the category label.
 * Returns translation keys like "routed", "reassigned", "rerouted", "salesforce_assigned"
 * that can be used with the t() function to get translated labels.
 */
export const getAssignmentReasonCategory = (assignmentReason: AssignmentReasonEnum): string => {
  switch (assignmentReason) {
    case AssignmentReasonEnum.ROUTING_FORM_ROUTING:
    case AssignmentReasonEnum.ROUTING_FORM_ROUTING_FALLBACK:
      return "routed";
    case AssignmentReasonEnum.REASSIGNED:
    case AssignmentReasonEnum.RR_REASSIGNED:
      return "reassigned";
    case AssignmentReasonEnum.REROUTED:
      return "rerouted";
    case AssignmentReasonEnum.SALESFORCE_ASSIGNMENT:
      return "salesforce_assigned";
    default:
      return "routed";
  }
};
