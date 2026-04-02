import type { DailyCall } from "@daily-co/daily-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BUTTONS } from "../button-states";
import { createCalVideoCallbacks } from "../cal-video-premium-features";

vi.mock("@calcom/lib/constants", () => ({
  TRANSCRIPTION_STARTED_ICON: "/transcription-started-icon.svg",
  RECORDING_IN_PROGRESS_ICON: "/recording-in-progress-icon.svg",
  TRANSCRIPTION_STOPPED_ICON: "/transcription-stopped-icon.svg",
  RECORDING_DEFAULT_ICON: "/recording-default-icon.svg",
}));

const mockDaily: DailyCall = {
  startRecording: vi.fn(),
  stopRecording: vi.fn(),
  startTranscription: vi.fn(),
  stopTranscription: vi.fn(),
  updateCustomTrayButtons: vi.fn(),
} as unknown as DailyCall;

const createMockRecording = (isRecording = false) => ({
  isRecording,
});

const createMockTranscription = (isTranscribing = false) => ({
  isTranscribing,
});

describe("CalVideoPremiumFeatures - End-to-End Callback Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("onMeetingJoined", () => {
    it("should start transcription automatically when enabled and not already transcribing", () => {
      const callbacks = createCalVideoCallbacks({
        daily: mockDaily,
        recording: createMockRecording(),
        transcription: createMockTranscription(false), // not transcribing
        showRecordingButton: true,
        showTranscriptionButton: true,
        enableAutomaticTranscription: true,
        enableAutomaticRecordingForOrganizer: false,
      });

      callbacks.onMeetingJoined();

      expect(mockDaily.startTranscription).toHaveBeenCalledTimes(1);
      expect(mockDaily.startRecording).not.toHaveBeenCalled();
    });

    it("should start recording automatically when enabled and not already recording", () => {
      const callbacks = createCalVideoCallbacks({
        daily: mockDaily,
        recording: createMockRecording(false), // not recording
        transcription: createMockTranscription(),
        showRecordingButton: true,
        showTranscriptionButton: true,
        enableAutomaticTranscription: false,
        enableAutomaticRecordingForOrganizer: true,
      });

      callbacks.onMeetingJoined();

      expect(mockDaily.startRecording).toHaveBeenCalledTimes(1);
      expect(mockDaily.startRecording).toHaveBeenCalledWith({
        videoBitrate: 2000,
      });
      expect(mockDaily.startTranscription).not.toHaveBeenCalled();
    });

    it("should start both transcription and recording when both are enabled", () => {
      const callbacks = createCalVideoCallbacks({
        daily: mockDaily,
        recording: createMockRecording(false),
        transcription: createMockTranscription(false),
        showRecordingButton: true,
        showTranscriptionButton: true,
        enableAutomaticTranscription: true,
        enableAutomaticRecordingForOrganizer: true,
      });

      callbacks.onMeetingJoined();

      expect(mockDaily.startTranscription).toHaveBeenCalledTimes(1);
      expect(mockDaily.startRecording).toHaveBeenCalledTimes(1);
    });

    it("should not start transcription when already transcribing", () => {
      const callbacks = createCalVideoCallbacks({
        daily: mockDaily,
        recording: createMockRecording(),
        transcription: createMockTranscription(true), // already transcribing
        showRecordingButton: true,
        showTranscriptionButton: true,
        enableAutomaticTranscription: true,
        enableAutomaticRecordingForOrganizer: false,
      });

      callbacks.onMeetingJoined();

      expect(mockDaily.startTranscription).not.toHaveBeenCalled();
    });

    it("should not start recording when already recording", () => {
      const callbacks = createCalVideoCallbacks({
        daily: mockDaily,
        recording: createMockRecording(true), // already recording
        transcription: createMockTranscription(),
        showRecordingButton: true,
        showTranscriptionButton: true,
        enableAutomaticTranscription: false,
        enableAutomaticRecordingForOrganizer: true,
      });

      callbacks.onMeetingJoined();

      expect(mockDaily.startRecording).not.toHaveBeenCalled();
    });
  });

  describe("onCustomButtonClick - Recording Button", () => {
    it("should start recording when click occurs on Recording button and recording is stopped", async () => {
      const callbacks = createCalVideoCallbacks({
        daily: mockDaily,
        recording: createMockRecording(false), // not recording
        transcription: createMockTranscription(),
        showRecordingButton: true,
        showTranscriptionButton: true,
        enableAutomaticTranscription: false,
        enableAutomaticRecordingForOrganizer: false,
      });

      await callbacks.onCustomButtonClick({ button_id: "recording" });

      expect(mockDaily.startRecording).toHaveBeenCalledTimes(1);
      expect(mockDaily.startRecording).toHaveBeenCalledWith({
        videoBitrate: 2000,
      });
      expect(mockDaily.stopRecording).not.toHaveBeenCalled();
      expect(mockDaily.updateCustomTrayButtons).toHaveBeenCalledWith({
        recording: BUTTONS.WAIT_FOR_RECORDING_TO_START,
        transcription: BUTTONS.START_TRANSCRIPTION, // current state included
      });
    });

    it("should stop recording when click occurs on Recording button and recording is started", async () => {
      const callbacks = createCalVideoCallbacks({
        daily: mockDaily,
        recording: createMockRecording(true), // currently recording
        transcription: createMockTranscription(),
        showRecordingButton: true,
        showTranscriptionButton: true,
        enableAutomaticTranscription: false,
        enableAutomaticRecordingForOrganizer: false,
      });

      await callbacks.onCustomButtonClick({ button_id: "recording" });

      expect(mockDaily.stopRecording).toHaveBeenCalledTimes(1);
      expect(mockDaily.startRecording).not.toHaveBeenCalled();
      expect(mockDaily.updateCustomTrayButtons).toHaveBeenCalledWith({
        recording: BUTTONS.WAIT_FOR_RECORDING_TO_STOP,
        transcription: BUTTONS.START_TRANSCRIPTION, // current state included
      });
    });
  });

  describe("onCustomButtonClick - Transcription Button", () => {
    it("should start transcription when click occurs on Transcription button and transcription is stopped", async () => {
      const callbacks = createCalVideoCallbacks({
        daily: mockDaily,
        recording: createMockRecording(),
        transcription: createMockTranscription(false), // not transcribing
        showRecordingButton: true,
        showTranscriptionButton: true,
        enableAutomaticTranscription: false,
        enableAutomaticRecordingForOrganizer: false,
      });

      await callbacks.onCustomButtonClick({ button_id: "transcription" });

      expect(mockDaily.startTranscription).toHaveBeenCalledTimes(1);
      expect(mockDaily.stopTranscription).not.toHaveBeenCalled();
      expect(mockDaily.updateCustomTrayButtons).toHaveBeenCalledWith({
        recording: BUTTONS.START_RECORDING, // current state included
        transcription: BUTTONS.WAIT_FOR_TRANSCRIPTION_TO_START,
      });
    });

    it("should stop transcription when click occurs on Transcription button and transcription is started", async () => {
      const callbacks = createCalVideoCallbacks({
        daily: mockDaily,
        recording: createMockRecording(),
        transcription: createMockTranscription(true), // currently transcribing
        showRecordingButton: true,
        showTranscriptionButton: true,
        enableAutomaticTranscription: false,
        enableAutomaticRecordingForOrganizer: false,
      });

      await callbacks.onCustomButtonClick({ button_id: "transcription" });

      expect(mockDaily.stopTranscription).toHaveBeenCalledTimes(1);
      expect(mockDaily.startTranscription).not.toHaveBeenCalled();
      expect(mockDaily.updateCustomTrayButtons).toHaveBeenCalledWith({
        recording: BUTTONS.START_RECORDING, // current state included
        transcription: BUTTONS.WAIT_FOR_TRANSCRIPTION_TO_STOP,
      });
    });
  });

  describe("onRecordingStarted", () => {
    it("should update custom tray buttons to show stop recording button", () => {
      const callbacks = createCalVideoCallbacks({
        daily: mockDaily,
        recording: createMockRecording(),
        transcription: createMockTranscription(),
        showRecordingButton: true,
        showTranscriptionButton: true,
        enableAutomaticTranscription: false,
        enableAutomaticRecordingForOrganizer: false,
      });

      callbacks.onRecordingStarted();

      expect(mockDaily.updateCustomTrayButtons).toHaveBeenCalledWith({
        recording: BUTTONS.STOP_RECORDING,
        transcription: BUTTONS.START_TRANSCRIPTION, // current state included
      });
    });
  });

  describe("onRecordingStopped", () => {
    it("should update custom tray buttons to show start recording button", () => {
      const callbacks = createCalVideoCallbacks({
        daily: mockDaily,
        recording: createMockRecording(),
        transcription: createMockTranscription(),
        showRecordingButton: true,
        showTranscriptionButton: true,
        enableAutomaticTranscription: false,
        enableAutomaticRecordingForOrganizer: false,
      });

      callbacks.onRecordingStopped();

      expect(mockDaily.updateCustomTrayButtons).toHaveBeenCalledWith({
        recording: BUTTONS.START_RECORDING,
        transcription: BUTTONS.START_TRANSCRIPTION, // current state included
      });
    });
  });

  describe("onTranscriptionStarted", () => {
    it("should update custom tray buttons to show stop transcription button", () => {
      const callbacks = createCalVideoCallbacks({
        daily: mockDaily,
        recording: createMockRecording(),
        transcription: createMockTranscription(),
        showRecordingButton: true,
        showTranscriptionButton: true,
        enableAutomaticTranscription: false,
        enableAutomaticRecordingForOrganizer: false,
      });

      callbacks.onTranscriptionStarted();

      expect(mockDaily.updateCustomTrayButtons).toHaveBeenCalledWith({
        recording: BUTTONS.START_RECORDING, // current state included
        transcription: BUTTONS.STOP_TRANSCRIPTION,
      });
    });
  });

  describe("onTranscriptionStopped", () => {
    it("should update custom tray buttons to show start transcription button", () => {
      const callbacks = createCalVideoCallbacks({
        daily: mockDaily,
        recording: createMockRecording(),
        transcription: createMockTranscription(),
        showRecordingButton: true,
        showTranscriptionButton: true,
        enableAutomaticTranscription: false,
        enableAutomaticRecordingForOrganizer: false,
      });

      callbacks.onTranscriptionStopped();

      expect(mockDaily.updateCustomTrayButtons).toHaveBeenCalledWith({
        recording: BUTTONS.START_RECORDING, // current state included
        transcription: BUTTONS.START_TRANSCRIPTION,
      });
    });
  });

  describe("toggleRecording", () => {
    it("should start recording when not currently recording", async () => {
      const callbacks = createCalVideoCallbacks({
        daily: mockDaily,
        recording: createMockRecording(false), // not recording
        transcription: createMockTranscription(),
        showRecordingButton: true,
        showTranscriptionButton: true,
        enableAutomaticTranscription: false,
        enableAutomaticRecordingForOrganizer: false,
      });

      await callbacks.toggleRecording();

      expect(mockDaily.startRecording).toHaveBeenCalledTimes(1);
      expect(mockDaily.startRecording).toHaveBeenCalledWith({
        videoBitrate: 2000,
      });
      expect(mockDaily.stopRecording).not.toHaveBeenCalled();
      expect(mockDaily.updateCustomTrayButtons).toHaveBeenCalledWith({
        recording: BUTTONS.WAIT_FOR_RECORDING_TO_START,
        transcription: BUTTONS.START_TRANSCRIPTION, // current state included
      });
    });

    it("should stop recording when currently recording", async () => {
      const callbacks = createCalVideoCallbacks({
        daily: mockDaily,
        recording: createMockRecording(true), // currently recording
        transcription: createMockTranscription(),
        showRecordingButton: true,
        showTranscriptionButton: true,
        enableAutomaticTranscription: false,
        enableAutomaticRecordingForOrganizer: false,
      });

      await callbacks.toggleRecording();

      expect(mockDaily.stopRecording).toHaveBeenCalledTimes(1);
      expect(mockDaily.startRecording).not.toHaveBeenCalled();
      expect(mockDaily.updateCustomTrayButtons).toHaveBeenCalledWith({
        recording: BUTTONS.WAIT_FOR_RECORDING_TO_STOP,
        transcription: BUTTONS.START_TRANSCRIPTION, // current state included
      });
    });
  });

  describe("toggleTranscription", () => {
    it("should start transcription when not currently transcribing", async () => {
      const callbacks = createCalVideoCallbacks({
        daily: mockDaily,
        recording: createMockRecording(),
        transcription: createMockTranscription(false), // not transcribing
        showRecordingButton: true,
        showTranscriptionButton: true,
        enableAutomaticTranscription: false,
        enableAutomaticRecordingForOrganizer: false,
      });

      await callbacks.toggleTranscription();

      expect(mockDaily.startTranscription).toHaveBeenCalledTimes(1);
      expect(mockDaily.stopTranscription).not.toHaveBeenCalled();
      expect(mockDaily.updateCustomTrayButtons).toHaveBeenCalledWith({
        recording: BUTTONS.START_RECORDING, // current state included
        transcription: BUTTONS.WAIT_FOR_TRANSCRIPTION_TO_START,
      });
    });

    it("should stop transcription when currently transcribing", async () => {
      const callbacks = createCalVideoCallbacks({
        daily: mockDaily,
        recording: createMockRecording(),
        transcription: createMockTranscription(true), // currently transcribing
        showRecordingButton: true,
        showTranscriptionButton: true,
        enableAutomaticTranscription: false,
        enableAutomaticRecordingForOrganizer: false,
      });

      await callbacks.toggleTranscription();

      expect(mockDaily.stopTranscription).toHaveBeenCalledTimes(1);
      expect(mockDaily.startTranscription).not.toHaveBeenCalled();
      expect(mockDaily.updateCustomTrayButtons).toHaveBeenCalledWith({
        recording: BUTTONS.START_RECORDING, // current state included
        transcription: BUTTONS.WAIT_FOR_TRANSCRIPTION_TO_STOP,
      });
    });
  });

  describe("updateCustomTrayButtons", () => {
    it("should update both recording and transcription buttons when both are shown", () => {
      const callbacks = createCalVideoCallbacks({
        daily: mockDaily,
        recording: createMockRecording(false),
        transcription: createMockTranscription(false),
        showRecordingButton: true,
        showTranscriptionButton: true,
        enableAutomaticTranscription: false,
        enableAutomaticRecordingForOrganizer: false,
      });

      callbacks.updateCustomTrayButtons({
        recording: BUTTONS.STOP_RECORDING,
        transcription: BUTTONS.STOP_TRANSCRIPTION,
      });

      expect(mockDaily.updateCustomTrayButtons).toHaveBeenCalledWith({
        recording: BUTTONS.STOP_RECORDING,
        transcription: BUTTONS.STOP_TRANSCRIPTION,
      });
    });

    it("should update only recording button when transcription button is not shown", () => {
      const callbacks = createCalVideoCallbacks({
        daily: mockDaily,
        recording: createMockRecording(false),
        transcription: createMockTranscription(false),
        showRecordingButton: true,
        showTranscriptionButton: false,
        enableAutomaticTranscription: false,
        enableAutomaticRecordingForOrganizer: false,
      });

      callbacks.updateCustomTrayButtons({
        recording: BUTTONS.STOP_RECORDING,
      });

      expect(mockDaily.updateCustomTrayButtons).toHaveBeenCalledWith({
        recording: BUTTONS.STOP_RECORDING,
      });
    });

    it("should update only transcription button when recording button is not shown", () => {
      const callbacks = createCalVideoCallbacks({
        daily: mockDaily,
        recording: createMockRecording(false),
        transcription: createMockTranscription(false),
        showRecordingButton: false,
        showTranscriptionButton: true,
        enableAutomaticTranscription: false,
        enableAutomaticRecordingForOrganizer: false,
      });

      callbacks.updateCustomTrayButtons({
        transcription: BUTTONS.STOP_TRANSCRIPTION,
      });

      expect(mockDaily.updateCustomTrayButtons).toHaveBeenCalledWith({
        transcription: BUTTONS.STOP_TRANSCRIPTION,
      });
    });

    it("should use current state when no override is provided", () => {
      const callbacks = createCalVideoCallbacks({
        daily: mockDaily,
        recording: createMockRecording(true), // currently recording
        transcription: createMockTranscription(false), // not transcribing
        showRecordingButton: true,
        showTranscriptionButton: true,
        enableAutomaticTranscription: false,
        enableAutomaticRecordingForOrganizer: false,
      });

      callbacks.updateCustomTrayButtons({});

      expect(mockDaily.updateCustomTrayButtons).toHaveBeenCalledWith({
        recording: BUTTONS.STOP_RECORDING, // because isRecording is true
        transcription: BUTTONS.START_TRANSCRIPTION, // because isTranscribing is false
      });
    });
  });

  describe("startRecording", () => {
    it("should call daily.startRecording with correct parameters", () => {
      const callbacks = createCalVideoCallbacks({
        daily: mockDaily,
        recording: createMockRecording(),
        transcription: createMockTranscription(),
        showRecordingButton: true,
        showTranscriptionButton: true,
        enableAutomaticTranscription: false,
        enableAutomaticRecordingForOrganizer: false,
      });

      callbacks.startRecording();

      expect(mockDaily.startRecording).toHaveBeenCalledTimes(1);
      expect(mockDaily.startRecording).toHaveBeenCalledWith({
        videoBitrate: 2000,
      });
    });
  });
});
