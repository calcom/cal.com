import { useTranscription, useRecording } from "@daily-co/daily-react";
import { useDaily, useDailyEvent } from "@daily-co/daily-react";
import React, { Fragment, useCallback, useRef, useState, useLayoutEffect, useEffect } from "react";

import {
  TRANSCRIPTION_STARTED_ICON,
  RECORDING_IN_PROGRESS_ICON,
  TRANSCRIPTION_STOPPED_ICON,
  RECORDING_DEFAULT_ICON,
} from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";

const BUTTONS = {
  STOP_TRANSCRIPTION: {
    label: "Stop",
    tooltip: "Stop transcription",
    iconPath: TRANSCRIPTION_STARTED_ICON,
    iconPathDarkMode: TRANSCRIPTION_STARTED_ICON,
  },
  START_TRANSCRIPTION: {
    label: "Cal.ai",
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

export type DailyCustomTrayButtonVisualState = "default" | "sidebar-open" | "active";

export interface DailyCustomTrayButton {
  iconPath: string;
  iconPathDarkMode?: string;
  label: string;
  tooltip: string;
  visualState?: DailyCustomTrayButtonVisualState;
}
export const CalAiTranscribe = ({
  showRecordingButton,
  enableAutomaticTranscription,
  showTranscriptionButton,
}: {
  showRecordingButton: boolean;
  enableAutomaticTranscription: boolean;
  showTranscriptionButton: boolean;
}) => {
  const daily = useDaily();
  const { t } = useLocale();

  const [transcript, setTranscript] = useState("");

  const [transcriptHeight, setTranscriptHeight] = useState(0);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  const transcription = useTranscription();
  const recording = useRecording();

  const updateCustomTrayButtons = ({
    recording,
    transcription,
  }: {
    recording: DailyCustomTrayButton;
    transcription: DailyCustomTrayButton;
  }) => {
    daily?.updateCustomTrayButtons({
      ...(showRecordingButton
        ? {
            recording,
          }
        : {}),
      ...(showTranscriptionButton
        ? {
            transcription,
          }
        : {}),
    });
  };

  useDailyEvent(
    "app-message",
    useCallback((ev) => {
      const data = ev?.data;
      if (data.user_name && data.text) setTranscript(`${data.user_name}: ${data.text}`);
    }, [])
  );

  useDailyEvent("joined-meeting", (ev) => {
    if (enableAutomaticTranscription) {
      daily?.startTranscription();
      updateCustomTrayButtons({
        recording: BUTTONS.START_RECORDING,
        transcription: transcription?.isTranscribing
          ? BUTTONS.STOP_TRANSCRIPTION
          : BUTTONS.START_TRANSCRIPTION,
      });
    }
  });

  useDailyEvent("transcription-started", (ev) => {
    updateCustomTrayButtons({
      recording: recording?.isRecording ? BUTTONS.STOP_RECORDING : BUTTONS.START_RECORDING,
      transcription: BUTTONS.STOP_TRANSCRIPTION,
    });
  });

  useDailyEvent("recording-started", (ev) => {
    updateCustomTrayButtons({
      recording: BUTTONS.STOP_RECORDING,
      transcription: transcription?.isTranscribing ? BUTTONS.STOP_TRANSCRIPTION : BUTTONS.START_TRANSCRIPTION,
    });
  });

  useDailyEvent("transcription-stopped", (ev) => {
    updateCustomTrayButtons({
      recording: recording?.isRecording ? BUTTONS.STOP_RECORDING : BUTTONS.START_RECORDING,
      transcription: BUTTONS.START_TRANSCRIPTION,
    });
  });

  useDailyEvent("recording-stopped", (ev) => {
    updateCustomTrayButtons({
      recording: BUTTONS.START_RECORDING,
      transcription: transcription?.isTranscribing ? BUTTONS.STOP_TRANSCRIPTION : BUTTONS.START_TRANSCRIPTION,
    });
  });

  const toggleRecording = async () => {
    if (recording?.isRecording) {
      updateCustomTrayButtons({
        recording: BUTTONS.WAIT_FOR_RECORDING_TO_STOP,
        transcription: transcription?.isTranscribing
          ? BUTTONS.STOP_TRANSCRIPTION
          : BUTTONS.START_TRANSCRIPTION,
      });
      await daily?.stopRecording();
    } else {
      updateCustomTrayButtons({
        recording: BUTTONS.WAIT_FOR_RECORDING_TO_START,
        transcription: transcription?.isTranscribing
          ? BUTTONS.STOP_TRANSCRIPTION
          : BUTTONS.START_TRANSCRIPTION,
      });

      await daily?.startRecording({
        // 480p
        videoBitrate: 2000,
      });
    }
  };

  const toggleTranscription = async () => {
    if (transcription?.isTranscribing) {
      updateCustomTrayButtons({
        recording: recording?.isRecording ? BUTTONS.STOP_RECORDING : BUTTONS.START_RECORDING,
        transcription: BUTTONS.WAIT_FOR_TRANSCRIPTION_TO_STOP,
      });
      daily?.stopTranscription();
    } else {
      updateCustomTrayButtons({
        recording: recording?.isRecording ? BUTTONS.STOP_RECORDING : BUTTONS.START_RECORDING,
        transcription: BUTTONS.WAIT_FOR_TRANSCRIPTION_TO_START,
      });

      daily?.startTranscription();
    }
  };

  useDailyEvent("custom-button-click", async (ev) => {
    if (ev?.button_id === "recording") {
      toggleRecording();
    } else if (ev?.button_id === "transcription") {
      toggleTranscription();
    }
  });

  useLayoutEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setTranscriptHeight(entry.target.scrollHeight);
      }
    });

    if (transcriptRef.current) {
      observer.observe(transcriptRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current?.scrollHeight,
      behavior: "smooth",
    });
  }, [transcriptHeight]);

  return transcript ? (
    <div
      id="cal-ai-transcription"
      style={{
        textShadow: "0 0 20px black, 0 0 20px black, 0 0 20px black",
        backgroundColor: "rgba(0,0,0,0.6)",
      }}
      ref={transcriptRef}
      className="flex max-h-full justify-center overflow-x-hidden overflow-y-scroll p-2 text-center text-white">
      {transcript
        ? transcript.split("\n").map((line, i) => (
            <Fragment key={`transcript-${i}`}>
              {i > 0 && <br />}
              {line}
            </Fragment>
          ))
        : ""}
    </div>
  ) : null;
};
