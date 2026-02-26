import { describe, expect, it } from "vitest";
import { TracedError } from "./error";
import type { TraceContext } from "./index";

const makeTraceContext = (overrides?: Partial<TraceContext>): TraceContext => ({
  traceId: "trace_abc123",
  spanId: "span_def456",
  operation: "test-operation",
  ...overrides,
});

describe("TracedError", () => {
  describe("constructor", () => {
    it("extracts message from Error instance", () => {
      const original = new Error("something broke");
      const traced = new TracedError(original, makeTraceContext());

      expect(traced.message).toBe("something broke");
    });

    it("converts non-Error to string for message", () => {
      const traced = new TracedError("string error", makeTraceContext());
      expect(traced.message).toBe("string error");
    });

    it("converts number to string for message", () => {
      const traced = new TracedError(42, makeTraceContext());
      expect(traced.message).toBe("42");
    });

    it("preserves Error name from original error", () => {
      const original = new TypeError("bad type");
      const traced = new TracedError(original, makeTraceContext());

      expect(traced.name).toBe("TypeError");
    });

    it("uses 'TracedError' name for non-Error values", () => {
      const traced = new TracedError("plain string", makeTraceContext());
      expect(traced.name).toBe("TracedError");
    });

    it("stores traceId from traceContext", () => {
      const ctx = makeTraceContext({ traceId: "trace_xyz" });
      const traced = new TracedError(new Error("test"), ctx);

      expect(traced.traceId).toBe("trace_xyz");
    });

    it("stores original error reference", () => {
      const original = new Error("original");
      const traced = new TracedError(original, makeTraceContext());

      expect(traced.originalError).toBe(original);
    });

    it("copies stack from Error instance", () => {
      const original = new Error("with stack");
      const traced = new TracedError(original, makeTraceContext());

      expect(traced.stack).toBe(original.stack);
    });

    it("merges error.data with additionalData", () => {
      const errorWithData = Object.assign(new Error("err"), {
        data: { foo: "bar" },
      });
      const traced = new TracedError(errorWithData, makeTraceContext(), { baz: 42 });

      expect(traced.data).toEqual({ foo: "bar", baz: 42 });
    });

    it("uses only additionalData when error has no data property", () => {
      const traced = new TracedError(new Error("err"), makeTraceContext(), { key: "value" });

      expect(traced.data).toEqual({ key: "value" });
    });

    it("leaves data undefined when no additionalData and no error.data", () => {
      const traced = new TracedError(new Error("err"), makeTraceContext());

      expect(traced.data).toBeUndefined();
    });

    it("handles non-Error object with data property", () => {
      const errorObj = { data: { nested: true }, message: "obj error" };
      const traced = new TracedError(errorObj, makeTraceContext());

      expect(traced.data).toEqual({ nested: true });
    });

    it("additionalData overrides error.data on key collision", () => {
      const errorWithData = Object.assign(new Error("err"), {
        data: { shared: "from-error" },
      });
      const traced = new TracedError(errorWithData, makeTraceContext(), { shared: "from-additional" });

      expect(traced.data).toEqual({ shared: "from-additional" });
    });
  });

  describe("toJSON", () => {
    it("returns serializable object with all fields", () => {
      const original = new Error("json test");
      const ctx = makeTraceContext({ traceId: "trace_json" });
      const traced = new TracedError(original, ctx, { extra: 1 });
      const json = traced.toJSON();

      expect(json).toEqual({
        name: "Error",
        message: "json test",
        traceId: "trace_json",
        data: { extra: 1 },
        stack: original.stack,
      });
    });

    it("includes undefined data when no data provided", () => {
      const traced = new TracedError(new Error("no data"), makeTraceContext());
      const json = traced.toJSON();

      expect(json.data).toBeUndefined();
    });
  });

  describe("createFromError", () => {
    it("returns same instance if error is already a TracedError", () => {
      const existing = new TracedError(new Error("already traced"), makeTraceContext());
      const result = TracedError.createFromError(existing, makeTraceContext({ traceId: "different" }));

      expect(result).toBe(existing);
      expect(result.traceId).toBe("trace_abc123");
    });

    it("wraps non-TracedError Error into TracedError", () => {
      const original = new Error("wrap me");
      const ctx = makeTraceContext({ traceId: "trace_wrap" });
      const result = TracedError.createFromError(original, ctx);

      expect(result).toBeInstanceOf(TracedError);
      expect(result.message).toBe("wrap me");
      expect(result.traceId).toBe("trace_wrap");
    });

    it("wraps string error into TracedError", () => {
      const result = TracedError.createFromError("string err", makeTraceContext());

      expect(result).toBeInstanceOf(TracedError);
      expect(result.message).toBe("string err");
    });

    it("passes additionalData through to new TracedError", () => {
      const result = TracedError.createFromError(new Error("test"), makeTraceContext(), { context: "extra" });

      expect(result.data).toEqual({ context: "extra" });
    });
  });
});
