import type { Logger } from "tslog";

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operation: string;
  // So that we don't violate open closed principle, we allow meta to be added to the trace context
  meta?: Record<string, string | number | boolean | null | undefined>;
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
    additionalMeta?: Record<string, string | number | boolean | null | undefined>
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

  getTracingLogger(
    context: TraceContext,
    additionalMeta?: Record<string, string | number | boolean | null | undefined>
  ) {
    const mergedMeta = {
      ...context.meta,
      ...additionalMeta,
    };

    const prefixes = [
      "distributed-trace",
      `trace:${context.traceId}`,
      `span:${context.spanId}`,
      `op:${context.operation}`,
    ];

    if (mergedMeta) {
      Object.entries(mergedMeta).forEach(([key, value]) => {
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

  updateTrace(
    traceContext: TraceContext,
    additionalMeta?: Record<string, string | number | boolean | null | undefined>
  ): TraceContext {
    return {
      ...traceContext,
      meta: {
        ...traceContext.meta,
        ...additionalMeta,
      },
    };
  }
}
