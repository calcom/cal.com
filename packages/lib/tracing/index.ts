import { nanoid } from "nanoid";

import logger from "../logger";

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operation: string;
  // So that we don't violate open closed principle, we allow meta to be added to the trace context
  meta?: Record<string, any>;
}

export class DistributedTracing {
  static createTrace(operation: string, context?: Partial<TraceContext>): TraceContext {
    const { traceId, spanId, meta, ...otherContext } = context || {};
    return {
      traceId: traceId || `trace_${nanoid()}`,
      spanId: `span_${nanoid()}`,
      parentSpanId: spanId,
      operation,
      meta,
      ...otherContext,
    };
  }

  static createSpan(
    parentContext: TraceContext,
    operation: string,
    additionalMeta?: Record<string, any>
  ): TraceContext {
    const mergedMeta = {
      ...parentContext.meta,
      ...additionalMeta,
    };

    return {
      ...parentContext,
      spanId: `span_${nanoid()}`,
      parentSpanId: parentContext.spanId,
      operation,
      meta: mergedMeta,
    };
  }

  static getTracingLogger(context: TraceContext) {
    const prefixes = [
      "distributed-trace",
      `trace:${context.traceId}`,
      `span:${context.spanId}`,
      `op:${context.operation}`,
    ];

    if (context.meta) {
      Object.entries(context.meta).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          prefixes.push(`${key}:${value}`);
        }
      });
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
