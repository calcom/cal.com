import type { Dispatch } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";
import {
  Sheet,
  SheetContent,
  SheetBody,
  SheetHeader,
  SheetFooter,
  SheetClose,
} from "@calcom/ui/components/sheet";

import type { CallDetailsAction, CallDetailsState } from "./types";

interface CallDetailsSheetProps {
  state: CallDetailsState;
  dispatch: Dispatch<CallDetailsAction>;
}

export function CallDetailsSheet({ state, dispatch }: CallDetailsSheetProps) {
  const { t } = useLocale();
  const { selectedCall } = state.callDetailsSheet;

  if (!selectedCall) return null;

  const formatDuration = (durationMs: number) => {
    const totalSeconds = Math.round(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <Sheet
      open={true}
      onOpenChange={() => {
        dispatch({ type: "CLOSE_MODAL" });
      }}>
      <SheetContent className="bg-default max-w-2xl overflow-y-auto">
        <SheetHeader showCloseButton={true}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-emphasis font-sans text-xl font-semibold">{t("call_details")}</h2>
              <p className="text-subtle mt-1 text-sm">
                {t("call_id")}: {selectedCall.call_id}{" "}
                <Badge variant={selectedCall.call_status === "ended" ? "green" : "orange"}>
                  {selectedCall.call_status}
                </Badge>
              </p>
            </div>
          </div>
        </SheetHeader>

        <SheetBody className="flex flex-col stack-y-6 p-4">
          {/* Call Information */}
          <div className="stack-y-3">
            <h3 className="text-emphasis text-base font-semibold">{t("call_information")}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-subtle text-sm">{t("start_time")}</p>
                <p className="text-default text-sm font-medium">
                  {selectedCall.start_timestamp ? formatTimestamp(selectedCall.start_timestamp) : t("unknown")}
                </p>
              </div>
              <div>
                <p className="text-subtle text-sm">{t("duration")}</p>
                <p className="text-default text-sm font-medium">{selectedCall.duration_ms ? formatDuration(selectedCall.duration_ms) : t("unknown")}</p>
              </div>
              <div>
                <p className="text-subtle text-sm">{t("from")}</p>
                <p className="text-default text-sm font-medium">{"from_number" in selectedCall ? selectedCall.from_number || t("unknown") : t("unknown")}</p>
              </div>
              <div>
                <p className="text-subtle text-sm">{t("to")}</p>
                <p className="text-default text-sm font-medium">{"to_number" in selectedCall ? selectedCall.to_number || t("unknown") : t("unknown")}</p>
              </div>
              <div>
                <p className="text-subtle text-sm">{t("sentiment")}</p>
                <Badge
                  variant={
                    selectedCall.call_analysis?.user_sentiment === "Positive"
                      ? "green"
                      : selectedCall.call_analysis?.user_sentiment === "Negative"
                      ? "red"
                      : "gray"
                  }>
                  {selectedCall.call_analysis?.user_sentiment || "Unknown"}
                </Badge>
              </div>
              <div>
                <p className="text-subtle text-sm">{t("disconnect_reason")}</p>
                <p className="text-default text-sm font-medium">
                  {selectedCall.disconnection_reason?.replace(/_/g, " ")}
                </p>
              </div>
            </div>
          </div>

          {/* Call Summary */}
          {selectedCall.call_analysis?.call_summary && (
            <div className="stack-y-3">
              <h3 className="text-emphasis text-base font-semibold">{t("call_summary")}</h3>
              <p className="text-default text-sm">{selectedCall.call_analysis.call_summary}</p>
            </div>
          )}

          {/* Recording Section */}
          <div className="stack-y-3">
            <h3 className="text-emphasis text-base font-semibold">{t("recording")}</h3>
            <div className="flex items-center gap-3">
              <audio controls className="h-11 w-[258px]" src={selectedCall.recording_url}>
                Your browser does not support the audio element.
              </audio>
              <Button color="minimal" href={selectedCall.recording_url} target="_blank" StartIcon="download">
                {t("download")}
              </Button>
            </div>
          </div>

          {/* Transcription */}
          <div className="stack-y-3">
            <h3 className="text-emphasis text-base font-semibold">{t("transcription")}</h3>
            <div className="border-subtle max-h-96 stack-y-3 overflow-y-auto rounded-md border p-4">
              {selectedCall.transcript ? (
                selectedCall.transcript
                  .split("\n")
                  .filter((line) => line.trim())
                  .map((line, index) => {
                    const isAgent = line.startsWith("Agent:");
                    const isUser = line.startsWith("User:");
                    const content = line.replace(/^(Agent:|User:)\s*/, "");

                    if (!isAgent && !isUser) return null;

                    return (
                      <div key={index} className="stack-y-1">
                        <div className="flex items-center gap-2">
                          <Icon name="user" className={isAgent ? "text-info" : "text-success"} />
                          <span className={`text-sm font-medium ${isAgent ? "text-info" : "text-success"}`}>
                            {isAgent ? t("agent") : t("user")}
                          </span>
                        </div>
                        <p className="text-default ml-7 text-sm">{content}</p>
                      </div>
                    );
                  })
              ) : (
                <p className="text-subtle text-sm">{t("no_transcript_available")}</p>
              )}
            </div>
          </div>

          {/* Event Details */}
          {selectedCall.retell_llm_dynamic_variables && (
            <div className="stack-y-3">
              <h3 className="text-emphasis text-base font-semibold">{t("event_details")}</h3>
              <div className="border-subtle bg-cal-muted rounded-md border p-4">
                <pre className="text-default overflow-x-auto text-xs">
                  {JSON.stringify(selectedCall.retell_llm_dynamic_variables, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </SheetBody>

        <SheetFooter>
          <SheetClose asChild>
            <Button color="secondary">{t("close")}</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
