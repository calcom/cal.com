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

export interface RoutingTraceRecord {
  id: string;
  createdAt: Date;
  trace: RoutingTrace;
  formResponseId: number | null;
  queuedFormResponseId: string | null;
  bookingUid: string | null;
  assignmentReasonId: number | null;
}

export interface IRoutingTraceRepositoryCreateArgs {
  trace: RoutingTrace;
  formResponseId?: number;
  queuedFormResponseId?: string;
  bookingUid: string;
  assignmentReasonId?: number;
}

export interface IRoutingTraceRepository {
  create(args: IRoutingTraceRepositoryCreateArgs): Promise<RoutingTraceRecord>;
  findByBookingUid(bookingUid: string): Promise<RoutingTraceRecord | null>;
}
