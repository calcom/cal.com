import { AssignmentReasonEnum } from "@calcom/prisma/enums";

const assignmentReasonBadgeTitleMap = (assignmentReason: AssignmentReasonEnum) => {
  switch (assignmentReason) {
    case AssignmentReasonEnum.ROUTING_FORM_ROUTING || AssignmentReasonEnum.ROUTING_FORM_ROUTING_FALLBACK:
      return "routed";
    case AssignmentReasonEnum.REASSIGNED:
      return "reassigned";
    case AssignmentReasonEnum.REROUTED:
      return "rerouted";
    case AssignmentReasonEnum.SALESFORCE_ASSIGNMENT:
      return "salesforce_assignment";
    default:
      return "routed";
  }
};

export default assignmentReasonBadgeTitleMap;
