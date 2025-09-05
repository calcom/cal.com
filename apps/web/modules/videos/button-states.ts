import {
  RECORDING_DEFAULT_ICON,
  RECORDING_IN_PROGRESS_ICON,
  TRANSCRIPTION_STARTED_ICON,
  TRANSCRIPTION_STOPPED_ICON,
} from "@calcom/lib/constants";

export const BUTTONS = {
  STOP_TRANSCRIPTION: {
    label: "Stop",
    tooltip: "Stop transcription",
    iconPath: TRANSCRIPTION_STARTED_ICON,
    iconPathDarkMode: TRANSCRIPTION_STARTED_ICON,
  },
  START_TRANSCRIPTION: {
    label: "Transcribe",
    tooltip: "Transcription powered by AI",
    iconPath: TRANSCRIPTION_STOPPED_ICON,
    iconPathDarkMode: TRANSCRIPTION_STOPPED_ICON,
  },
  WAIT_FOR_TRANSCRIPTION_TO_START: {
    label: "Starting..",
    tooltip: "Please wait while we start transcription",
    iconPath: TRANSCRIPTION_STOPPED_ICON,
    iconPathDarkMode: TRANSCRIPTION_STOPPED_ICON,
  },
  WAIT_FOR_TRANSCRIPTION_TO_STOP: {
    label: "Stopping..",
    tooltip: "Please wait while we stop transcription",
    iconPath: TRANSCRIPTION_STOPPED_ICON,
    iconPathDarkMode: TRANSCRIPTION_STOPPED_ICON,
  },
  START_RECORDING: {
    label: "Record",
    tooltip: "Start recording",
    iconPath: RECORDING_DEFAULT_ICON,
    iconPathDarkMode: RECORDING_DEFAULT_ICON,
  },
  WAIT_FOR_RECORDING_TO_START: {
    label: "Starting..",
    tooltip: "Please wait while we start recording",
    iconPath: RECORDING_DEFAULT_ICON,
    iconPathDarkMode: RECORDING_DEFAULT_ICON,
  },
  WAIT_FOR_RECORDING_TO_STOP: {
    label: "Stopping..",
    tooltip: "Please wait while we stop recording",
    iconPath: RECORDING_DEFAULT_ICON,
    iconPathDarkMode: RECORDING_DEFAULT_ICON,
  },
  STOP_RECORDING: {
    label: "Stop",
    tooltip: "Stop recording",
    iconPath: RECORDING_IN_PROGRESS_ICON,
    iconPathDarkMode: RECORDING_IN_PROGRESS_ICON,
  },
};
