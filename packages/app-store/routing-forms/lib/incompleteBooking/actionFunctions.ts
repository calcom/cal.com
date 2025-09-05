import { incompleteBookingAction as salesforceIncompleteBookingAction } from "@calcom/app-store/salesforce/lib/routingForm/incompleteBookingAction";
import { IncompleteBookingActionType } from "@calcom/prisma/enums";
import type { App_RoutingForms_IncompleteBookingActions } from "@prisma/client";

const incompleteBookingActionFunctions: Record<
  IncompleteBookingActionType,
  (action: App_RoutingForms_IncompleteBookingActions, email: string) => void
> = {
  [IncompleteBookingActionType.SALESFORCE]: salesforceIncompleteBookingAction,
};

export default incompleteBookingActionFunctions;
