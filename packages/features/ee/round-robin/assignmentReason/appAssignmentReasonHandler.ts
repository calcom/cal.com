import { assignmentReasonHandler as salesforceAssignmentReasonHandler } from "@calcom/app-store/salesforce/lib/assignmentReasonHandler";
import type { AssignmentReasonEnum } from "@calcom/prisma/enums";

type AppAssignmentReasonHandler = ({
  recordType,
  teamMemberEmail,
  routingFormResponseId,
}: {
  recordType: string;
  teamMemberEmail: string;
  routingFormResponseId: number;
}) => Promise<{ assignmentReason: string | undefined; reasonEnum: AssignmentReasonEnum } | undefined>;

const appBookingFormHandler: Record<string, AppAssignmentReasonHandler> = {
  salesforce: salesforceAssignmentReasonHandler,
};

export default appBookingFormHandler;
