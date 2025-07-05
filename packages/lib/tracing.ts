import { nanoid } from "nanoid";

import logger from "./logger";

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operation: string;
  bookingUid?: string;
  eventTypeId?: number;
  userId?: number;
}

export class DistributedTracing {
  static createTrace(operation: string, context?: Partial<TraceContext>): TraceContext {
    return {
      traceId: context?.traceId || `trace_${nanoid()}`,
      spanId: `span_${nanoid()}`,
      parentSpanId: context?.spanId,
      operation,
      ...context,
    };
  }

  static createSpan(parentContext: TraceContext, operation: string): TraceContext {
    return {
      ...parentContext,
      spanId: `span_${nanoid()}`,
      parentSpanId: parentContext.spanId,
      operation,
    };
  }

  static getTracingLogger(context: TraceContext) {
    return logger.getSubLogger({
      prefix: [
        "distributed-trace",
        `trace:${context.traceId}`,
        `span:${context.spanId}`,
        `op:${context.operation}`,
      ],
    });
  }

  static extractTraceFromPayload(payload: string): TraceContext | null {
    try {
      const parsed = JSON.parse(payload);
      if (parsed._traceContext && parsed._traceContext.traceId) {
        return parsed._traceContext;
      }
    } catch {}
    return null;
  }

  static injectTraceIntoPayload(payload: any, traceContext?: TraceContext): any {
    if (!traceContext) return payload;

    return {
      ...payload,
      _traceContext: traceContext,
    };
  }
}
