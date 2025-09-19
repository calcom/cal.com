import { incompleteBookingAction as salesforceIncompleteBookingAction } from "@calcom/app-store/salesforce/lib/routingForm/incompleteBookingAction";
import type { App_RoutingForms_IncompleteBookingActions } from "@calcom/prisma/client";
import { IncompleteBookingActionType } from "@calcom/prisma/enums";

const incompleteBookingActionFunctions: Record<
  IncompleteBookingActionType,
  (action: App_RoutingForms_IncompleteBookingActions, email: string) => void
> = {
  [IncompleteBookingActionType.SALESFORCE]: salesforceIncompleteBookingAction,
};

export default incompleteBookingActionFunctions;
