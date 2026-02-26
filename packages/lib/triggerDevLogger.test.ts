import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@trigger.dev/sdk", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { logger } from "@trigger.dev/sdk";

import { TriggerDevLogger } from "./triggerDevLogger";

describe("TriggerDevLogger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("defaults minLevel to INFO (1)", () => {
      const log = new TriggerDevLogger();
      expect(log.settings.minLevel).toBe(1);
    });

    it("accepts custom minLevel", () => {
      const log = new TriggerDevLogger({ minLevel: 0 });
      expect(log.settings.minLevel).toBe(0);
    });
  });

  describe("level filtering", () => {
    it("info logs when minLevel <= INFO", () => {
      const log = new TriggerDevLogger({ minLevel: 1 });
      log.info("hello");
      expect(logger.info).toHaveBeenCalledWith("hello");
    });

    it("info does not log when minLevel > INFO", () => {
      const log = new TriggerDevLogger({ minLevel: 2 });
      log.info("hidden");
      expect(logger.info).not.toHaveBeenCalled();
    });

    it("debug logs when minLevel <= DEBUG", () => {
      const log = new TriggerDevLogger({ minLevel: 0 });
      log.debug("debug msg");
      expect(logger.debug).toHaveBeenCalledWith("debug msg");
    });

    it("debug does not log when minLevel > DEBUG", () => {
      const log = new TriggerDevLogger({ minLevel: 1 });
      log.debug("hidden");
      expect(logger.debug).not.toHaveBeenCalled();
    });

    it("warn logs when minLevel <= WARN", () => {
      const log = new TriggerDevLogger({ minLevel: 2 });
      log.warn("warning");
      expect(logger.warn).toHaveBeenCalledWith("warning");
    });

    it("warn does not log when minLevel > WARN", () => {
      const log = new TriggerDevLogger({ minLevel: 3 });
      log.warn("hidden");
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it("error always logs at any minLevel <= ERROR", () => {
      const log = new TriggerDevLogger({ minLevel: 3 });
      log.error("critical");
      expect(logger.error).toHaveBeenCalledWith("critical");
    });
  });

  describe("method aliases", () => {
    it("trace logs at debug level", () => {
      const log = new TriggerDevLogger({ minLevel: 0 });
      log.trace("trace msg");
      expect(logger.debug).toHaveBeenCalledWith("trace msg");
    });

    it("silly logs at debug level", () => {
      const log = new TriggerDevLogger({ minLevel: 0 });
      log.silly("silly msg");
      expect(logger.debug).toHaveBeenCalledWith("silly msg");
    });

    it("log logs at info level", () => {
      const log = new TriggerDevLogger({ minLevel: 0 });
      log.log("log msg");
      expect(logger.info).toHaveBeenCalledWith("log msg");
    });
  });

  describe("argument formatting", () => {
    it("joins multiple string arguments with spaces", () => {
      const log = new TriggerDevLogger({ minLevel: 0 });
      log.info("hello", "world");
      expect(logger.info).toHaveBeenCalledWith("hello world");
    });

    it("JSON.stringifies objects", () => {
      const log = new TriggerDevLogger({ minLevel: 0 });
      log.info("data:", { key: "value" });
      expect(logger.info).toHaveBeenCalledWith('data: {"key":"value"}');
    });

    it("handles unserializable objects gracefully", () => {
      const log = new TriggerDevLogger({ minLevel: 0 });
      const circular: Record<string, unknown> = {};
      circular.self = circular;
      log.info("obj:", circular);
      expect(logger.info).toHaveBeenCalledWith("obj: [Unserializable Object]");
    });
  });

  describe("getSubLogger", () => {
    it("returns a new logger with prefix", () => {
      const log = new TriggerDevLogger({ minLevel: 0 });
      const sub = log.getSubLogger({ name: "SubModule" });
      (sub as unknown as TriggerDevLogger).info("sub message");
      expect(logger.info).toHaveBeenCalledWith("SubModule sub message");
    });

    it("inherits minLevel from parent", () => {
      const log = new TriggerDevLogger({ minLevel: 2 });
      const sub = log.getSubLogger({ name: "Sub" });
      (sub as unknown as TriggerDevLogger).debug("hidden");
      expect(logger.debug).not.toHaveBeenCalled();
    });
  });
});
