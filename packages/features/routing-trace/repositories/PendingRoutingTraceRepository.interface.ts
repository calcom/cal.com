import type {
  BaseRoutingTrace,
  RoutingTrace,
} from "./RoutingTraceRepository.interface";

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
  findByFormResponseId(formResponseId: number): Promise<PendingRoutingTraceRecord | null>;
  findByQueuedFormResponseId(queuedFormResponseId: string): Promise<PendingRoutingTraceRecord | null>;
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

export type IPendingRoutingTraceRepositoryCreateArgs =
  | CreateWithFormResponse
  | CreateWithQueuedFormResponse;
