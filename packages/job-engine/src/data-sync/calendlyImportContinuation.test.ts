import { describe, expect, it, vi } from "vitest";

import {
  CALENDLY_IMPORT_CONTINUATION_ERROR,
  isCalendlyImportContinuationError,
  runCalendlyImportWithContinuation,
} from "./calendlyImportContinuation";

describe("calendlyImportContinuation", () => {
  it("identifies continuation errors", () => {
    expect(isCalendlyImportContinuationError(new Error(CALENDLY_IMPORT_CONTINUATION_ERROR))).toBe(true);
    expect(isCalendlyImportContinuationError(new Error("OTHER_ERROR"))).toBe(false);
    expect(isCalendlyImportContinuationError("CONTINUATION_REQUIRED")).toBe(false);
  });

  it("schedules continuation and returns continued=true", async () => {
    const scheduleContinuation = vi.fn(async () => undefined);

    const result = await runCalendlyImportWithContinuation({
      runImport: async () => {
        throw new Error(CALENDLY_IMPORT_CONTINUATION_ERROR);
      },
      scheduleContinuation,
    });

    expect(result).toEqual({ continued: true });
    expect(scheduleContinuation).toHaveBeenCalledTimes(1);
  });

  it("rethrows non-continuation errors", async () => {
    const scheduleContinuation = vi.fn(async () => undefined);
    const error = new Error("DB failed");

    await expect(
      runCalendlyImportWithContinuation({
        runImport: async () => {
          throw error;
        },
        scheduleContinuation,
      })
    ).rejects.toThrow("DB failed");

    expect(scheduleContinuation).not.toHaveBeenCalled();
  });
});
