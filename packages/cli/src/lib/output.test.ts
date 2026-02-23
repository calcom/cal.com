import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleOutput, outputError, outputJson, outputSuccess, outputTable, outputWarning } from "./output";

describe("output", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("outputJson", () => {
    it("outputs JSON with indentation", () => {
      const data = { id: 1, name: "test" };
      outputJson(data);
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
    });

    it("handles arrays", () => {
      const data = [1, 2, 3];
      outputJson(data);
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
    });

    it("handles null", () => {
      outputJson(null);
      expect(logSpy).toHaveBeenCalledWith("null");
    });
  });

  describe("outputError", () => {
    it("outputs error message to stderr", () => {
      outputError("Something went wrong");
      expect(errorSpy).toHaveBeenCalledTimes(1);
      const output = errorSpy.mock.calls[0][0] as string;
      expect(output).toContain("Something went wrong");
    });
  });

  describe("outputSuccess", () => {
    it("outputs success message", () => {
      outputSuccess("Operation completed");
      expect(logSpy).toHaveBeenCalledTimes(1);
      const output = logSpy.mock.calls[0][0] as string;
      expect(output).toContain("Operation completed");
    });
  });

  describe("outputWarning", () => {
    it("outputs warning message", () => {
      outputWarning("Be careful");
      expect(logSpy).toHaveBeenCalledTimes(1);
      const output = logSpy.mock.calls[0][0] as string;
      expect(output).toContain("Be careful");
    });
  });

  describe("outputTable", () => {
    it("outputs formatted table with headers and rows", () => {
      const headers = ["ID", "Name"];
      const rows = [
        ["1", "Alice"],
        ["2", "Bob"],
      ];
      outputTable(headers, rows);
      // header line + separator + 2 data rows = 4 calls
      expect(logSpy).toHaveBeenCalledTimes(4);
    });

    it("handles empty rows", () => {
      outputTable(["ID", "Name"], []);
      expect(logSpy).toHaveBeenCalledTimes(1);
      const output = logSpy.mock.calls[0][0] as string;
      expect(output).toContain("No results found");
    });

    it("pads columns correctly", () => {
      const headers = ["ID", "Name"];
      const rows = [["1", "LongNameHere"]];
      outputTable(headers, rows);
      // header + separator + 1 data row = 3 calls
      expect(logSpy).toHaveBeenCalledTimes(3);
    });

    it("handles missing cells in rows", () => {
      const headers = ["A", "B", "C"];
      const rows = [["1", "2"]];
      outputTable(headers, rows);
      expect(logSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe("handleOutput", () => {
    it("outputs JSON when json option is true", () => {
      const data = { id: 1 };
      const formatter = vi.fn();
      handleOutput(data, { json: true }, formatter);
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
      expect(formatter).not.toHaveBeenCalled();
    });

    it("calls formatter when json option is false", () => {
      const data = { id: 1 };
      const formatter = vi.fn();
      handleOutput(data, { json: false }, formatter);
      expect(formatter).toHaveBeenCalledWith(data);
    });

    it("calls formatter when json option is undefined", () => {
      const data = { id: 1 };
      const formatter = vi.fn();
      handleOutput(data, {}, formatter);
      expect(formatter).toHaveBeenCalledWith(data);
    });
  });
});
