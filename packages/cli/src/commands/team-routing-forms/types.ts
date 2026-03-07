import type {
  CreateRoutingFormResponseOutput,
  GetRoutingFormResponsesOutput,
  GetRoutingFormsOutput,
  RoutingFormOutput,
  RoutingFormResponseOutput,
  UpdateRoutingFormResponseOutput,
} from "../../generated/types.gen";

export type RoutingForm = RoutingFormOutput;
export type RoutingFormResponse = RoutingFormResponseOutput;
export type RoutingFormsListResponse = GetRoutingFormsOutput["data"];
export type RoutingFormResponsesResponse = GetRoutingFormResponsesOutput["data"];
export type CreateResponseResult = CreateRoutingFormResponseOutput["data"];
export type UpdateResponseResult = UpdateRoutingFormResponseOutput["data"];
