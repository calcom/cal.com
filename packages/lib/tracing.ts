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
  eventTypeSlug?: string;
  userInfo?: string | string[];
  userIp?: string;
  rescheduleUid?: string;
}

export class DistributedTracing {
  static createTrace(operation: string, context?: Partial<TraceContext>): TraceContext {
    const { traceId, spanId, ...otherContext } = context || {};
    return {
      traceId: traceId || `trace_${nanoid()}`,
      spanId: `span_${nanoid()}`,
      parentSpanId: spanId,
      operation,
      ...otherContext,
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
    const prefixes = [
      "distributed-trace",
      `trace:${context.traceId}`,
      `span:${context.spanId}`,
      `op:${context.operation}`,
    ];

    if (context.eventTypeId && context.userInfo && context.eventTypeSlug) {
      prefixes.push(`event:${context.eventTypeId}:${context.userInfo}/${context.eventTypeSlug}`);
    }

    if (context.bookingUid) {
      prefixes.push(`booking:${context.bookingUid}`);
    }

    if (context.userId) {
      prefixes.push(`user:${context.userId}`);
    }

    return logger.getSubLogger({ prefix: prefixes });
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
