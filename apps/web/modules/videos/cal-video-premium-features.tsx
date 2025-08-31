import type { DailyCall } from "@daily-co/daily-js";
import { useTranscription, useRecording } from "@daily-co/daily-react";
import { useDaily, useDailyEvent } from "@daily-co/daily-react";
import React, { Fragment, useCallback, useRef, useState, useLayoutEffect, useEffect } from "react";

import { BUTTONS } from "./button-states";

export type DailyCustomTrayButtonVisualState = "default" | "sidebar-open" | "active";

export interface DailyCustomTrayButton {
  iconPath: string;
  iconPathDarkMode?: string;
  label: string;
  tooltip: string;
  visualState?: DailyCustomTrayButtonVisualState;
}

type RecordingState = {
  isRecording: boolean;
};

type TranscriptionState = {
  isTranscribing: boolean;
};

type CalVideoCallbacksParams = {
  daily: DailyCall | null;
  recording: RecordingState | null;
  transcription: TranscriptionState | null;
  showRecordingButton: boolean;
  showTranscriptionButton: boolean;
  enableAutomaticTranscription: boolean;
  enableAutomaticRecordingForOrganizer: boolean;
};

export const createCalVideoCallbacks = (params: CalVideoCallbacksParams) => {
  const {
    daily,
    recording,
    transcription,
    showRecordingButton,
    showTranscriptionButton,
    enableAutomaticTranscription,
    enableAutomaticRecordingForOrganizer,
  } = params;

  const startRecording = () => {
    daily?.startRecording({
      // 480p
      videoBitrate: 2000,
    });
  };

  const updateCustomTrayButtons = ({
    recording: overrideRecording,
    transcription: overrideTranscription,
  }: {
    recording?: DailyCustomTrayButton;
    transcription?: DailyCustomTrayButton;
  }) => {
    const currentRecordingState = recording?.isRecording ? BUTTONS.STOP_RECORDING : BUTTONS.START_RECORDING;
    const currentTranscriptionState = transcription?.isTranscribing
      ? BUTTONS.STOP_TRANSCRIPTION
      : BUTTONS.START_TRANSCRIPTION;

    daily?.updateCustomTrayButtons({
      ...(showRecordingButton
        ? {
            recording: overrideRecording ?? currentRecordingState,
          }
        : {}),
      ...(showTranscriptionButton
        ? {
            transcription: overrideTranscription ?? currentTranscriptionState,
          }
        : {}),
    });
  };

  const onMeetingJoined = () => {
    if (enableAutomaticTranscription && !transcription?.isTranscribing) {
      daily?.startTranscription();
    }
    if (enableAutomaticRecordingForOrganizer && !recording?.isRecording) {
      startRecording();
    }
  };

  const onRecordingStarted = () => {
    updateCustomTrayButtons({
      recording: BUTTONS.STOP_RECORDING,
    });
  };

  const onRecordingStopped = () => {
    updateCustomTrayButtons({
      recording: BUTTONS.START_RECORDING,
    });
  };

  const onTranscriptionStarted = () => {
    updateCustomTrayButtons({
      transcription: BUTTONS.STOP_TRANSCRIPTION,
    });
  };

  const onTranscriptionStopped = () => {
    updateCustomTrayButtons({
      transcription: BUTTONS.START_TRANSCRIPTION,
    });
  };

  const toggleRecording = async () => {
    if (recording?.isRecording) {
      updateCustomTrayButtons({
        recording: BUTTONS.WAIT_FOR_RECORDING_TO_STOP,
      });
      daily?.stopRecording();
    } else {
      updateCustomTrayButtons({
        recording: BUTTONS.WAIT_FOR_RECORDING_TO_START,
      });
      startRecording();
    }
  };

  const toggleTranscription = async () => {
    if (transcription?.isTranscribing) {
      updateCustomTrayButtons({
        transcription: BUTTONS.WAIT_FOR_TRANSCRIPTION_TO_STOP,
      });
      daily?.stopTranscription();
    } else {
      updateCustomTrayButtons({
        transcription: BUTTONS.WAIT_FOR_TRANSCRIPTION_TO_START,
      });
      daily?.startTranscription();
    }
  };

  const onCustomButtonClick = async (ev: { button_id: string }) => {
    if (ev?.button_id === "recording") {
      toggleRecording();
    } else if (ev?.button_id === "transcription") {
      toggleTranscription();
    }
  };

  return {
    onMeetingJoined,
    onRecordingStarted,
    onRecordingStopped,
    onTranscriptionStarted,
    onTranscriptionStopped,
    onCustomButtonClick,
    toggleRecording,
    toggleTranscription,
    updateCustomTrayButtons,
    startRecording,
  };
};

export const CalVideoPremiumFeatures = ({
  showRecordingButton,
  enableAutomaticTranscription,
  enableAutomaticRecordingForOrganizer,
  showTranscriptionButton,
}: {
  showRecordingButton: boolean;
  enableAutomaticTranscription: boolean;
  enableAutomaticRecordingForOrganizer: boolean;
  showTranscriptionButton: boolean;
}) => {
  const daily = useDaily();
  const [transcript, setTranscript] = useState("");
  const [transcriptHeight, setTranscriptHeight] = useState(0);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  const [inWaitingRoom, setInWaitingRoom] = useState(false);

  const transcription = useTranscription();
  const recording = useRecording();

  const callbacks = createCalVideoCallbacks({
    daily,
    recording,
    transcription,
    showRecordingButton,
    showTranscriptionButton,
    enableAutomaticTranscription,
    enableAutomaticRecordingForOrganizer,
  });

  useDailyEvent(
    "app-message",
    useCallback((ev) => {
      const data = ev?.data;
      if (data.user_name && data.text) setTranscript(`${data.user_name}: ${data.text}`);
    }, [])
  );

  useDailyEvent(
    "waiting-room",
    useCallback((ev) => {
      setInWaitingRoom(ev?.inWaitingRoom ?? true);
    }, [])
  );

  useDailyEvent(
    "joined-meeting",
    useCallback(() => {
      setInWaitingRoom(false);
      callbacks.onMeetingJoined();
    }, [callbacks])
  );

  useDailyEvent("transcription-started", callbacks.onTranscriptionStarted);
  useDailyEvent("recording-started", callbacks.onRecordingStarted);
  useDailyEvent("transcription-stopped", callbacks.onTranscriptionStopped);
  useDailyEvent("recording-stopped", callbacks.onRecordingStopped);
  useDailyEvent("custom-button-click", callbacks.onCustomButtonClick);

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

  function t(arg0: string, arg1: string): React.ReactNode {
    throw new Error("Function not implemented.");
  }

  return (
    <>
      {inWaitingRoom && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="waiting-room-title"
          aria-live="polite"
          data-testid="waiting-room-overlay"
          className="bg-black/85 fixed inset-0 z-[1000] flex flex-col items-center justify-center text-center text-white">
          <div id="waiting-room-title" className="text-2xl font-semibold">
            {t("waitingRoom.title", "Waiting Room")}
          </div>
          <div className="mt-4 text-xl">
            {t("waitingRoom.meetingNotStarted", "The meeting hasn't started yet.")}
            <br />
            {t("waitingRoom.pleaseWait", "Please wait for the organizer to join.")}
            <br />
            <small className="text-base opacity-80">
              {t("waitingRoom.autoAdmit", "You will be admitted automatically when the meeting begins.")}
            </small>
          </div>
        </div>
      )}
      {transcript ? (
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
      ) : null}
    </>
  );
};
