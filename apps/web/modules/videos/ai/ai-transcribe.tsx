import { useTranscription } from "@daily-co/daily-react";
import { useDaily, useDailyEvent } from "@daily-co/daily-react";
import React, { Fragment, useCallback, useRef, useState, useLayoutEffect, useEffect } from "react";

const REFRESH_INTERVAL = 30000;

export const CalAiTransctibe = () => {
  const daily = useDaily();
  const [transcript, setTranscript] = useState("");
  const unhandledLines = useRef(0);

  const [transcriptHeight, setTranscriptHeight] = useState(0);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  useDailyEvent(
    "app-message",
    useCallback((ev) => {
      const data = ev?.data;
      console.log("data.app-message", data);

      setTranscript(`${data.user_name}: ${data.text}`);
    }, [])
  );

  const transcription = useTranscription({
    onTranscriptionAppData: useCallback(() => {
      unhandledLines.current++;
    }, []),
  });

  console.log("transcription", transcription);

  const requestTranscript = () => {
    unhandledLines.current = 0;

    daily?.sendAppMessage(
      {
        kind: "assist",
        task: "transcript",
      },
      "*"
    );
  };

  useEffect(() => {
    daily?.on("transcription-error", (ev) => {
      console.error("Transcription failed. Attempting to restart", ev);
      const lp = daily.participants().local;
      if (lp.owner) {
        daily.startTranscription();
      }
    });
    // Wait for a single participant joined event
    // to request transcript the first time local user joins.
    // Using this instead of joined-meeting to account for
    // app-message availability fluctuations between join times.
    daily?.once("participant-joined", () => {
      console.log("participant joined");
      requestTranscript();
    });

    const handleUnhandledTranscript = async () => {
      if (unhandledLines.current === 0) return;
      requestTranscript();
    };
    const interval = setInterval(handleUnhandledTranscript, REFRESH_INTERVAL);
    return () => {
      clearInterval(interval);
    };
  }, [daily]);

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
    <div
      id="cal-ai-thing"
      ref={transcriptRef}
      className="max-h-full overflow-x-hidden overflow-y-scroll p-2 text-center text-white">
      <button className="block" onClick={() => daily?.startTranscription()}>
        Click to Start Transcription
      </button>
      {transcript
        ? transcript.split("\n").map((line, i) => (
            <Fragment key={`transcript-${i}`}>
              {i > 0 && <br />}
              {line}
            </Fragment>
          ))
        : ""}
    </div>
  );
};
