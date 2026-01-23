import z from "zod";
import type { routingStepSchema } from "../schema/zod";

export type RoutingStep = z.infer<typeof routingStepSchema>;

export type RoutingTrace = RoutingStep[];

export interface BaseRoutingTrace {
  id: string;
  createdAt: Date;
  trace: string;
}

export interface RoutingTraceWithFormResponse extends BaseRoutingTrace {
  formResponseId: string;
}
