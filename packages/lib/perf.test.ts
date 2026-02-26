import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./logger", () => ({ default: { debug: vi.fn() } }));

import logger from "./logger";
import { logP } from "./perf";

describe("logP", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(logger.debug).mockClear();
  });

  it("returns a function", () => {
    expect(typeof logP("test")).toBe("function");
  });

  it("calls logger.debug when callback is invoked", () => {
    const end = logP("my operation");
    end();
    expect(logger.debug).toHaveBeenCalledOnce();
  });

  it("includes message in log output", () => {
    const end = logP("my operation");
    end();
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining("my operation"));
  });

  it("formats output with [PERF] prefix", () => {
    const end = logP("test");
    end();
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining("[PERF]:"));
  });

  it("calculates elapsed time", () => {
    const perfSpy = vi.spyOn(performance, "now").mockReturnValueOnce(100).mockReturnValueOnce(250);
    const end = logP("timed op");
    end();
    expect(logger.debug).toHaveBeenCalledWith("[PERF]: timed op took 150ms");
    perfSpy.mockRestore();
  });
});
