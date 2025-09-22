import { describe, it, expect, beforeEach } from "vitest";
import { CalVideoSettingsService } from "../video/CalVideoSettingsService";

describe("CalVideoSettingsService", () => {
  let service: CalVideoSettingsService;

  beforeEach(() => {
    service = new CalVideoSettingsService();
  });

  describe("createCalVideoSettings", () => {
    it("should return undefined when no settings provided", () => {
      const result = service.createCalVideoSettings(undefined);

      expect(result).toBeUndefined();
    });

    it("should create settings with provided values", () => {
      const settings = {
        disableRecordingForGuests: true,
        disableRecordingForOrganizer: false,
        enableAutomaticTranscription: true,
        redirectUrlOnExit: "https://example.com/exit",
      };

      const result = service.createCalVideoSettings(settings);

      expect(result).toEqual({
        create: {
          disableRecordingForGuests: true,
          disableRecordingForOrganizer: false,
          enableAutomaticTranscription: true,
          enableAutomaticRecordingForOrganizer: false,
          disableTranscriptionForGuests: false,
          disableTranscriptionForOrganizer: false,
          redirectUrlOnExit: "https://example.com/exit",
        },
      });
    });

    it("should use default values for missing settings", () => {
      const settings = {
        disableRecordingForGuests: true,
      };

      const result = service.createCalVideoSettings(settings);

      expect(result).toEqual({
        create: {
          disableRecordingForGuests: true,
          disableRecordingForOrganizer: false,
          enableAutomaticTranscription: false,
          enableAutomaticRecordingForOrganizer: false,
          disableTranscriptionForGuests: false,
          disableTranscriptionForOrganizer: false,
          redirectUrlOnExit: null,
        },
      });
    });
  });

  describe("validateSettings", () => {
    it("should return true for valid settings", () => {
      const settings = {
        disableRecordingForGuests: true,
        redirectUrlOnExit: "https://example.com",
      };

      const result = service.validateSettings(settings);

      expect(result).toBe(true);
    });

    it("should return false for invalid redirect URL", () => {
      const settings = {
        redirectUrlOnExit: "not-a-valid-url",
      };

      const result = service.validateSettings(settings);

      expect(result).toBe(false);
    });

    it("should return true when redirect URL is null", () => {
      const settings = {
        redirectUrlOnExit: null,
      };

      const result = service.validateSettings(settings);

      expect(result).toBe(true);
    });
  });

  describe("getDefaultSettings", () => {
    it("should return all default values", () => {
      const result = service.getDefaultSettings();

      expect(result).toEqual({
        disableRecordingForGuests: false,
        disableRecordingForOrganizer: false,
        enableAutomaticTranscription: false,
        enableAutomaticRecordingForOrganizer: false,
        disableTranscriptionForGuests: false,
        disableTranscriptionForOrganizer: false,
        redirectUrlOnExit: null,
      });
    });
  });
});