import { describe, expect, it, vi } from "vitest";

vi.mock("nanoid", () => ({ nanoid: () => "mock-nano-id" }));
vi.mock("../logger", () => ({
  default: { debug: vi.fn(), error: vi.fn(), getSubLogger: vi.fn() },
}));

import { createDistributedTracing, distributedTracing } from "./factory";
import { DistributedTracing } from "./index";

describe("createDistributedTracing", () => {
  it("returns a DistributedTracing instance", () => {
    const tracing = createDistributedTracing();
    expect(tracing).toBeInstanceOf(DistributedTracing);
  });

  it("creates trace with nanoid-based IDs", () => {
    const tracing = createDistributedTracing();
    const trace = tracing.createTrace("test-op");
    expect(trace.traceId).toContain("mock-nano-id");
    expect(trace.spanId).toContain("mock-nano-id");
  });

  it("sets operation on trace", () => {
    const tracing = createDistributedTracing();
    const trace = tracing.createTrace("my-operation");
    expect(trace.operation).toBe("my-operation");
  });
});

describe("distributedTracing export", () => {
  it("is a DistributedTracing instance", () => {
    expect(distributedTracing).toBeInstanceOf(DistributedTracing);
  });

  it("can create traces", () => {
    const trace = distributedTracing.createTrace("test");
    expect(trace.traceId).toBeDefined();
    expect(trace.spanId).toBeDefined();
    expect(trace.operation).toBe("test");
  });
});
