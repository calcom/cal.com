import type {
  EventTypeWorkflowOutput,
  GetEventTypeWorkflowOutput,
  GetEventTypeWorkflowsOutput,
  GetRoutingFormWorkflowOutput,
  GetRoutingFormWorkflowsOutput,
  RoutingFormWorkflowOutput,
} from "../../generated/types.gen";

export type TeamWorkflow = EventTypeWorkflowOutput;
export type TeamWorkflowList = GetEventTypeWorkflowsOutput["data"];
export type TeamWorkflowResponse = GetEventTypeWorkflowOutput["data"];

export type RoutingFormWorkflow = RoutingFormWorkflowOutput;
export type RoutingFormWorkflowList = GetRoutingFormWorkflowsOutput["data"];
export type RoutingFormWorkflowResponse = GetRoutingFormWorkflowOutput["data"];

export const VALID_EVENT_TYPE_TRIGGERS = [
  "beforeEvent",
  "eventCancelled",
  "newEvent",
  "afterEvent",
  "rescheduleEvent",
  "afterHostsCalVideoNoShow",
  "afterGuestsCalVideoNoShow",
  "bookingRejected",
  "bookingRequested",
  "bookingPaymentInitiated",
  "bookingPaid",
  "bookingNoShowUpdated",
] as const;

export type EventTypeTrigger = (typeof VALID_EVENT_TYPE_TRIGGERS)[number];

export const VALID_ROUTING_FORM_TRIGGERS = ["formSubmitted", "formSubmittedNoEvent"] as const;

export type RoutingFormTrigger = (typeof VALID_ROUTING_FORM_TRIGGERS)[number];
