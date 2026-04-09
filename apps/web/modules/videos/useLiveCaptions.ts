import { useDaily, useDailyEvent } from "@daily-co/daily-react";
import { trpc } from "@calcom/trpc/react";
import { useCallback } from "react";

/**
 * Automatically starts and stops Daily.co transcription based on the user's
 * saved accessibility preference (liveCaptionsEnabled).
 *
 * Reads liveCaptionsEnabled from trpc.viewer.me.get — the field is added to
 * the User model and exposed through the me router by feat/live-captions-db-layer.
 */
export function useLiveCaptions() {
  const daily = useDaily();

  const { data } = trpc.viewer.me.get.useQuery();
  const liveCaptionsEnabled = data?.liveCaptionsEnabled ?? false;

  useDailyEvent(
    "joined-meeting",
    useCallback(() => {
      if (!liveCaptionsEnabled) return;
      daily?.startTranscription({ language: "en", model: "nova-2", punctuate: true });
    }, [daily, liveCaptionsEnabled])
  );

  useDailyEvent(
    "left-meeting",
    useCallback(() => {
      if (!liveCaptionsEnabled) return;
      daily?.stopTranscription();
    }, [daily, liveCaptionsEnabled])
  );

  useDailyEvent(
    "transcription-error",
    useCallback((ev) => {
      // Log the error but do not crash the call — captions are non-critical
      console.error("Live captions transcription error:", ev);
    }, [])
  );
}
