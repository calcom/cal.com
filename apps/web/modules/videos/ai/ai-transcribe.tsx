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
  STOP_RECORDING: {
    label: "Stop",
    tooltip: "Stop recording",
    iconPath: RECORDING_IN_PROGRESS_ICON,
    iconPathDarkMode: RECORDING_IN_PROGRESS_ICON,
  },
};

export const CalAiTranscribe = () => {
  const daily = useDaily();
  const { t } = useLocale();

  const [transcript, setTranscript] = useState("");

  const [transcriptHeight, setTranscriptHeight] = useState(0);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  const transcription = useTranscription();
  const recording = useRecording();

  useDailyEvent(
    "app-message",
    useCallback((ev) => {
      const data = ev?.data;
      if (data.user_name && data.text) setTranscript(`${data.user_name}: ${data.text}`);
    }, [])
  );

  useDailyEvent("transcription-started", (ev) => {
    daily?.updateCustomTrayButtons({
      recording: recording?.isRecording ? BUTTONS.STOP_RECORDING : BUTTONS.START_RECORDING,
      transcription: BUTTONS.STOP_TRANSCRIPTION,
    });
  });

  useDailyEvent("recording-started", (ev) => {
    daily?.updateCustomTrayButtons({
      recording: BUTTONS.STOP_RECORDING,
      transcription: transcription?.isTranscribing ? BUTTONS.STOP_TRANSCRIPTION : BUTTONS.START_TRANSCRIPTION,
    });
  });

  useDailyEvent("transcription-stopped", (ev) => {
    daily?.updateCustomTrayButtons({
      recording: recording?.isRecording ? BUTTONS.STOP_RECORDING : BUTTONS.START_RECORDING,
      transcription: BUTTONS.START_TRANSCRIPTION,
    });
  });

  useDailyEvent("recording-stopped", (ev) => {
    daily?.updateCustomTrayButtons({
      recording: BUTTONS.START_RECORDING,
      transcription: transcription?.isTranscribing ? BUTTONS.STOP_TRANSCRIPTION : BUTTONS.START_TRANSCRIPTION,
    });
  });

  const toggleRecording = async () => {
    if (recording?.isRecording) {
      await daily?.stopRecording();
    } else {
      daily?.updateCustomTrayButtons({
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
      daily?.stopTranscription();
    } else {
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

  return (
    <>
      <div
        id="cal-ai-transcription"
        style={{
          textShadow: "0 0 20px black, 0 0 20px black, 0 0 20px black",
        }}
        ref={transcriptRef}
        className="max-h-full overflow-x-hidden overflow-y-scroll p-2 text-center text-white">
        {transcript
          ? transcript.split("\n").map((line, i) => (
              <Fragment key={`transcript-${i}`}>
                {i > 0 && <br />}
                {line}
              </Fragment>
            ))
          : ""}
      </div>
    </>
  );
};
