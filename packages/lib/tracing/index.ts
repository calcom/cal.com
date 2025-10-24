import type { Logger } from "tslog";

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operation: string;
  // So that we don't violate open closed principle, we allow meta to be added to the trace context
  meta?: Record<string, string>;
}

export interface IdGenerator {
  generate: () => string;
}

export class DistributedTracing {
  constructor(private idGenerator: IdGenerator, private loggerInstance: Logger<unknown>) {}

  createTrace(operation: string, context?: Partial<TraceContext>): TraceContext {
    const { traceId, spanId, meta, ...otherContext } = context || {};
    return {
      ...otherContext,
      traceId: traceId || `trace_${this.idGenerator.generate()}`,
      spanId: `span_${this.idGenerator.generate()}`,
      parentSpanId: spanId,
      operation,
      meta,
    };
  }

  createSpan(
    parentContext: TraceContext,
    operation: string,
    additionalMeta?: Record<string, string>
  ): TraceContext {
    const mergedMeta = {
      ...parentContext.meta,
      ...additionalMeta,
    };

    return {
      ...parentContext,
      spanId: `span_${this.idGenerator.generate()}`,
      parentSpanId: parentContext.spanId,
      operation,
      meta: mergedMeta,
    };
  }

  getTracingLogger(context: TraceContext) {
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

    return this.loggerInstance.getSubLogger({ prefix: prefixes });
  }

  extractTraceFromPayload(payload: string): TraceContext | null {
    try {
      const parsed = JSON.parse(payload);
      if (parsed._traceContext && parsed._traceContext.traceId) {
        return parsed._traceContext;
      }
    } catch {}
    return null;
  }

  injectTraceIntoPayload(payload: any, traceContext?: TraceContext): any {
    if (!traceContext) return payload;

    return {
      ...payload,
      _traceContext: traceContext,
    };
  }

  updateTrace(traceContext: TraceContext, additionalMeta?: Record<string, string>): TraceContext {
    return {
      ...traceContext,
      meta: {
        ...traceContext.meta,
        ...additionalMeta,
      },
    };
  }
}
