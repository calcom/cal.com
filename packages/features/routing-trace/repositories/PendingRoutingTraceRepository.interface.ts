import type { BaseRoutingTrace, RoutingTrace } from "./RoutingTraceRepository.interface";

export interface RoutingTraceWithQueuedResponse extends BaseRoutingTrace {
  queuedFormResponseId: string;
}

export interface PendingRoutingTraceRecord {
  id: string;
  createdAt: Date;
  trace: RoutingTrace;
  formResponseId: number | null;
  queuedFormResponseId: string | null;
}

export interface IPendingRoutingTraceRepository {
  create(args: IPendingRoutingTraceRepositoryCreateArgs): Promise<void>;
  findById(id: string): Promise<PendingRoutingTraceRecord | null>;
  findByFormResponseId(formResponseId: number): Promise<PendingRoutingTraceRecord | null>;
  findByQueuedFormResponseId(queuedFormResponseId: string): Promise<PendingRoutingTraceRecord | null>;
  /** Link a pending trace (created with queuedFormResponseId) to a formResponseId when the queued response is processed */
  linkToFormResponse(args: { queuedFormResponseId: string; formResponseId: number }): Promise<void>;
  /** Append additional trace steps to an existing pending trace */
  appendSteps(
    lookup: { formResponseId: number } | { queuedFormResponseId: string },
    steps: RoutingTrace
  ): Promise<boolean>;
  /** Promote a pending trace to a permanent RoutingTrace linked to a booking, then delete the pending record */
  promoteToBooking(args: { pendingTraceId: string; bookingUid: string }): Promise<void>;
}

interface BaseCreateArgs {
  trace: RoutingTrace;
}

interface CreateWithFormResponse extends BaseCreateArgs {
  formResponseId: number;
}

interface CreateWithQueuedFormResponse extends BaseCreateArgs {
  queuedFormResponseId: string;
}

export type IPendingRoutingTraceRepositoryCreateArgs = CreateWithFormResponse | CreateWithQueuedFormResponse;
