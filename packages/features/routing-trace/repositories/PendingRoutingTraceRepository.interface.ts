import type {
  BaseRoutingTrace,
  RoutingTrace,
} from "./RoutingTraceRepository.interface";

export interface RoutingTraceWithQueuedResponse extends BaseRoutingTrace {
  queuedFormResponseId: string;
}

export interface IPendingRoutingTraceRepository {
  create(args: IPendingRoutingTraceRepositoryCreateArgs): Promise<void>;
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
