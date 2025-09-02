import { useState, useEffect, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { RetellWebClient } from "retell-client-js-sdk";

import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

import type { FormValues } from "../pages/workflow";

interface WebCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  teamId?: number;
  form: UseFormReturn<FormValues>;
}

interface TranscriptEntry {
  speaker: "agent" | "user";
  text: string;
  timestamp: Date;
}

type CallStatus = "idle" | "connecting" | "active" | "ended" | "error";

export function WebCallDialog({ open, onOpenChange, agentId, teamId, form }: WebCallDialogProps) {
  const { t } = useLocale();
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [_callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const retellWebClientRef = useRef<RetellWebClient | null>(null);
  const callStartTimeRef = useRef<Date | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const isEmbed = useIsEmbed();

  const createWebCallMutation = trpc.viewer.aiVoiceAgent.createWebCall.useMutation({
    onSuccess: async (data) => {
      try {
        await startWebCall(data.accessToken);
      } catch (error) {
        console.error("Failed to start web call:", error);
        setCallStatus("error");
        setError("Failed to start web call. Please try again.");
      }
    },
    onError: (error: { message: string }) => {
      setCallStatus("error");
      setError(error.message);
      showToast(error.message, "error");
    },
  });

  const startWebCall = async (accessToken: string) => {
    try {
      const { RetellWebClient } = await import("retell-client-js-sdk");

      if (!retellWebClientRef.current) {
        retellWebClientRef.current = new RetellWebClient();
      }

      const retellWebClient = retellWebClientRef.current;

      retellWebClient.on("call_started", () => {
        console.log("Call started");
        setCallStatus("active");
        callStartTimeRef.current = new Date();
        startDurationTimer();
      });

      retellWebClient.on("call_ended", () => {
        console.log("Call ended");
        setCallStatus("ended");
        stopDurationTimer();
      });

      retellWebClient.on("agent_start_talking", () => {
        console.log("Agent started talking");
      });

      retellWebClient.on("agent_stop_talking", () => {
        console.log("Agent stopped talking");
      });

      retellWebClient.on("update", (update: { transcript?: Array<{ role: string; content: string }> }) => {
        console.log("Transcript update received:", JSON.stringify(update, null, 2));

        if (update.transcript && Array.isArray(update.transcript)) {
          console.log(`Processing ${update.transcript.length} transcript entries`);

          try {
            const newEntries: TranscriptEntry[] = update.transcript
              .map((entry) => {
                if (!entry.role || !entry.content) {
                  console.warn("Invalid transcript entry:", entry);
                  return null;
                }
                return {
                  speaker: entry.role === "agent" ? "agent" : "user",
                  text: entry.content,
                  timestamp: new Date(),
                };
              })
              .filter(Boolean) as TranscriptEntry[];

            console.log(`Setting ${newEntries.length} transcript entries`);
            setTranscript(newEntries);
          } catch (error) {
            console.error("Error processing transcript update:", error);
          }
        } else {
          console.log("No transcript data in update or transcript is not an array");
        }
      });

      retellWebClient.on("error", (error: Error | { message?: string }) => {
        console.error("Web call error:", error);
        setCallStatus("error");
        setError("Call encountered an error. Please try again.");
        stopDurationTimer();
      });

      setCallStatus("connecting");
      await retellWebClient.startCall({
        accessToken: accessToken,
        sampleRate: 24000,
        emitRawAudioSamples: false,
        enableUpdate: true,
      });
    } catch (error) {
      console.error("Error starting web call:", error);
      setCallStatus("error");
      setError("Failed to initialize web call. Please ensure microphone permissions are granted.");
    }
  };

  const startDurationTimer = () => {
    durationIntervalRef.current = setInterval(() => {
      if (callStartTimeRef.current) {
        const duration = Math.floor((Date.now() - callStartTimeRef.current.getTime()) / 1000);
        setCallDuration(duration);
      }
    }, 1000);
  };

  const stopDurationTimer = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  const handleStartCall = () => {
    const firstEventTypeId = form.getValues("activeOn")?.[0]?.value;
    if (!firstEventTypeId) {
      showToast(t("choose_at_least_one_event_type_test_call"), "error");
      return;
    }

    if (agentId) {
      setError(null);
      setTranscript([]);
      setCallDuration(0);
      createWebCallMutation.mutate({
        agentId: agentId,
        teamId: teamId,
        eventTypeId: parseInt(firstEventTypeId, 10),
      });
    }
  };

  const handleEndCall = async () => {
    if (retellWebClientRef.current && callStatus === "active") {
      try {
        await retellWebClientRef.current.stopCall();
        setCallStatus("ended");
        stopDurationTimer();
      } catch (error) {
        console.error("Error ending call:", error);
      }
    }
  };

  const handleToggleMute = async () => {
    if (retellWebClientRef.current && callStatus === "active") {
      try {
        if (isMuted) {
          await retellWebClientRef.current.unmute();
        } else {
          await retellWebClientRef.current.mute();
        }
        setIsMuted(!isMuted);
      } catch (error) {
        console.error("Error toggling mute:", error);
      }
    }
  };

  const _formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusIcon = () => {
    switch (callStatus) {
      case "connecting":
        return <Icon name="loader" className="text-brand h-4 w-4 animate-spin" />;
      case "active":
        return <Icon name="phone" className="text-success h-4 w-4" />;
      case "ended":
        return <Icon name="phone-off" className="text-muted h-4 w-4" />;
      case "error":
        return <Icon name="triangle-alert" className="text-error h-4 w-4" />;
      default:
        return <Icon name="phone" className="text-subtle h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    switch (callStatus) {
      case "connecting":
        return "Connecting to agent...";
      case "active":
        return `Call active - ${_formatDuration(_callDuration)}`;
      case "ended":
        return `Call ended - Duration: ${_formatDuration(_callDuration)}`;
      case "error":
        return error || "Call error";
      default:
        return "Ready to start call";
    }
  };

  useEffect(() => {
    if (isEmbed) {
      return;
    }

    if (transcriptEndRef.current) {
      // eslint-disable-next-line @calcom/eslint/no-scroll-into-view-embed
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcript, isEmbed]);

  useEffect(() => {
    return () => {
      stopDurationTimer();
      if (retellWebClientRef.current && callStatus === "active") {
        try {
          const stopCallResult = retellWebClientRef.current.stopCall();
          if (stopCallResult && typeof stopCallResult.catch === "function") {
            stopCallResult.catch(console.error);
          }
        } catch (error) {
          console.error("Error stopping call during cleanup:", error);
        }
      }
    };
  }, [callStatus]);

  const resetDialogState = () => {
    setCallStatus("idle");
    setTranscript([]);
    setIsMuted(false);
    setCallDuration(0);
    setError(null);
    callStartTimeRef.current = null;
    stopDurationTimer();
  };

  const handleClose = () => {
    console.log("WebCallDialog handleClose called, callStatus:", callStatus);
    if (callStatus === "active") {
      handleEndCall();
    }
    resetDialogState();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        console.log("WebCallDialog onOpenChange called with:", open);
        if (!open) {
          console.log("Dialog closing, callStatus:", callStatus);
          if (callStatus === "active") {
            handleEndCall();
          }
          resetDialogState();
        }
        onOpenChange(open);
      }}>
      <DialogContent
        enableOverflow
        type="creation"
        title={t("web_call_test")}
        description={t("test_your_agent_with_web_call")}>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm font-medium">{getStatusText()}</span>
          </div>
          {callStatus === "active" && (
            <div className="flex items-center gap-2">
              <div className="bg-error h-2 w-2 animate-pulse rounded-full" />
              <span className="text-subtle text-xs">Live</span>
            </div>
          )}
        </div>

        <div className="mt-2 rounded-lg border p-3 placeholder:min-h-[300px]">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-medium">Transcript</h4>
            {transcript.length > 0 && (
              <Button
                type="button"
                color="secondary"
                size="sm"
                variant="icon"
                onClick={() => setTranscript([])}
                disabled={callStatus === "active"}>
                <Icon name="trash" className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="h-60 space-y-3 overflow-y-auto p-2">
            {transcript.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-center">
                <div>
                  <Icon name="message-circle" className="text-subtle mx-auto h-8 w-8" />
                  <p className="text-subtle mt-2 text-sm">
                    {callStatus === "idle"
                      ? "Start a call to see the conversation"
                      : "Waiting for conversation..."}
                  </p>
                </div>
              </div>
            ) : (
              transcript.map((entry, index) => (
                <div
                  key={index}
                  className={`flex gap-2 ${entry.speaker === "agent" ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      entry.speaker === "agent"
                        ? "border-brand bg-brand/10 text-brand-emphasis border"
                        : "border-subtle bg-subtle text-emphasis border"
                    }`}>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xs font-medium">
                        {entry.speaker === "agent" ? "AI Agent" : "You"}
                      </span>
                    </div>
                    <p>{entry.text}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>

        {error && callStatus === "error" && (
          <div className="border-error bg-error/10 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Icon name="alert-triangle" className="text-error h-4 w-4" />
              <span className="text-error text-sm">{error}</span>
            </div>
          </div>
        )}

        <DialogFooter showDivider className="mt-6">
          <Button type="button" color="secondary" onClick={handleClose}>
            {callStatus === "active" ? t("end_and_close") : t("close")}
          </Button>

          <div className="flex gap-2">
            {callStatus === "active" && (
              <Button type="button" color="secondary" onClick={handleToggleMute} variant="icon">
                <Icon name={isMuted ? "mic-off" : "mic"} className="h-4 w-4" />
              </Button>
            )}

            {callStatus === "idle" ||
            callStatus === "error" ||
            callStatus === "ended" ||
            callStatus === "connecting" ? (
              <Button
                type="button"
                onClick={handleStartCall}
                loading={createWebCallMutation.isPending || callStatus === "connecting"}
                disabled={createWebCallMutation.isPending || callStatus === "connecting"}>
                <Icon name="phone" className="mr-2 h-4 w-4" />
                {callStatus === "connecting" ? t("connecting") : t("start_web_call")}
              </Button>
            ) : (
              <Button
                type="button"
                color="destructive"
                onClick={handleEndCall}
                disabled={callStatus !== "active"}>
                <Icon name="phone-off" className="mr-2 h-4 w-4" />
                {t("end_call")}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
