import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { RetellWebClient } from "retell-client-js-sdk";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";

import { getEventTypeIdForCalAiTest } from "../lib/actionHelperFunctions";
import type { FormValues } from "../pages/workflow";

interface WebCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  teamId?: number;
  isOrganization?: boolean;
  form: UseFormReturn<FormValues>;
  eventTypeIds?: number[];
  outboundEventTypeId?: number | null;
}

interface TranscriptEntry {
  speaker: "agent" | "user";
  text: string;
  timestamp: Date;
}

type CallStatus = "idle" | "connecting" | "active" | "ended" | "error";

export function WebCallDialog({
  open,
  onOpenChange,
  agentId,
  teamId,
  isOrganization = false,
  form,
  eventTypeIds = [],
  outboundEventTypeId,
}: WebCallDialogProps) {
  const { t } = useLocale();
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const retellWebClientRef = useRef<RetellWebClient | null>(null);
  const callStartTimeRef = useRef<Date | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const callStatusRef = useRef<CallStatus>("idle");

  const { data: hasCredits, isLoading: creditsLoading } = trpc.viewer.credits.hasAvailableCredits.useQuery(
    { teamId },
    { enabled: open }
  );

  const getBillingPath = () => {
    if (!teamId) return "/settings/billing";
    return isOrganization ? "/settings/organizations/billing" : `/settings/teams/${teamId}/billing`;
  };

  const createWebCallMutation = trpc.viewer.aiVoiceAgent.createWebCall.useMutation({
    onSuccess: async (data) => {
      try {
        await startWebCall(data.accessToken);
      } catch (error) {
        console.error("Failed to start web call:", error);
        setCallStatus("error");
        setError(t("failed_to_start_web_call_try_again"));
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

      const retellWebClient = new RetellWebClient();
      retellWebClientRef.current = retellWebClient;

      retellWebClient.on("call_started", () => {
        callStartTimeRef.current = new Date();
        callStatusRef.current = "active";
        setCallStatus("active");
        startDurationTimer();
      });

      retellWebClient.on("call_ended", () => {
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
        console.log("📝 Received update event:", update);

        if (update.transcript && Array.isArray(update.transcript)) {
          console.log("📜 Transcript array received:", update.transcript);

          try {
            const newEntries: TranscriptEntry[] = update.transcript
              .map((entry) => {
                if (!entry.role || !entry.content) {
                  console.warn("⚠️ Invalid transcript entry:", entry);
                  return null;
                }
                const mappedEntry = {
                  speaker: entry.role === "agent" ? "agent" : "user",
                  text: entry.content,
                  timestamp: new Date(),
                };
                console.log("✅ Mapped transcript entry:", mappedEntry);
                return mappedEntry;
              })
              .filter(Boolean) as TranscriptEntry[];

            console.log("🔄 Setting transcript with entries:", newEntries.length, "entries");
            console.log("📋 Current transcript state has:", transcript.length, "entries");

            setTranscript(newEntries);
          } catch (error) {
            console.error("❌ Error processing transcript update:", error);
          }
        } else {
          console.log(
            "🚫 No transcript data in update or transcript is not an array:",
            typeof update.transcript
          );
        }
      });

      retellWebClient.on("error", (error: Error | { message?: string }) => {
        console.error("Web call error:", error);
        setCallStatus("error");
        setError(t("call_encountered_error_try_again"));
        stopDurationTimer();
      });

      setCallStatus("connecting");
      await retellWebClient.startCall({
        accessToken: accessToken,
        sampleRate: 24000,
        emitRawAudioSamples: false,
      });
    } catch (error) {
      console.error("Error starting web call:", error);
      setCallStatus("error");
      setError(t("failed_initialize_web_call_microphone_permissions"));
    }
  };

  const startDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (!callStartTimeRef.current) {
      return;
    }

    durationIntervalRef.current = setInterval(() => {
      if (callStartTimeRef.current) {
        const now = Date.now();
        const startTime = callStartTimeRef.current.getTime();
        const duration = Math.floor((now - startTime) / 1000);
        if (duration >= 0) {
          setCallDuration(duration);
        }
      }
    }, 1000);
  }, []);

  const stopDurationTimer = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  const handleStartCall = () => {
    const eventTypeValidation = getEventTypeIdForCalAiTest({
      trigger: form.getValues("trigger"),
      outboundEventTypeId,
      eventTypeIds,
      activeOnEventTypeId: form.getValues("activeOn")?.[0]?.value,
      t,
    });

    if (eventTypeValidation.error || !eventTypeValidation.eventTypeId) {
      showToast(eventTypeValidation.error || t("no_event_type_selected"), "error");
      return;
    }

    if (agentId) {
      setError(null);
      setTranscript([]);
      setCallDuration(0);
      createWebCallMutation.mutate({
        agentId: agentId,
        teamId: teamId,
        eventTypeId: eventTypeValidation.eventTypeId,
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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusIcon = () => {
    switch (callStatus) {
      case "connecting":
        return <Icon name="loader" className="h-4 w-4 animate-spin rounded-full" />;
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
        return t("connecting_to_agent");
      case "active":
        return `${t("call_active")} - ${formatDuration(callDuration)}`;
      case "ended":
        return `${t("call_ended")} - ${formatDuration(callDuration)}`;
      case "error":
        return t("call_error");
      default:
        return t("ready_to_start_call");
    }
  };

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcript]);

  useEffect(() => {
    return () => {
      stopDurationTimer();
      if (retellWebClientRef.current && callStatus === "active") {
        try {
          retellWebClientRef.current.stopCall();
        } catch (error) {
          console.error("Error stopping call during cleanup:", error);
        }
      }
    };
  }, [callStatus]);

  useEffect(() => {
    callStatusRef.current = callStatus;

    if (callStatus === "active" && callStartTimeRef.current && !durationIntervalRef.current) {
      startDurationTimer();
    }
  }, [callStatus, startDurationTimer]);

  useEffect(() => {
    return () => {
      stopDurationTimer();
    };
  }, []);

  const resetDialogState = () => {
    setCallStatus("idle");
    callStatusRef.current = "idle";
    setTranscript([]);
    setIsMuted(false);
    setCallDuration(0);
    setError(null);
    callStartTimeRef.current = null;
    stopDurationTimer();
    retellWebClientRef.current = null;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          if (retellWebClientRef.current) {
            try {
              retellWebClientRef.current.stopCall();
            } catch (e) {
              console.error("Error stopping call on close:", e);
            }
          }
          resetDialogState();
        }
        onOpenChange(open);
      }}>
      <DialogContent
        enableOverflow
        type="creation"
        title={t("web_call")}
        description={t("test_your_agent_with_web_call")}>
        {!creditsLoading && (
          <Alert
            severity="info"
            CustomIcon="info"
            title={t("credits_required")}
            message={
              hasCredits ? (
                t("web_call_credits_info")
              ) : (
                <>
                  {t("web_call_no_credits")}{" "}
                  <Link href={getBillingPath()} className="text-semantic-info underline">
                    {t("purchase_credits")}
                  </Link>
                </>
              )
            }
          />
        )}
        <div className="mt-2 flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm font-medium">{getStatusText()}</span>
          </div>
          {callStatus === "active" && (
            <div className="flex items-center gap-2">
              <div className="bg-error h-2 w-2 animate-pulse rounded-full" />
              <span className="text-subtle text-xs">{t("live")}</span>
            </div>
          )}
        </div>

        <div className="mt-2 rounded-lg border p-3 placeholder:min-h-[300px]">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-medium">{t("transcript")}</h4>
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

          <div className="h-60 stack-y-3 overflow-y-auto p-2">
            {transcript.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-center">
                <div>
                  <Icon name="message-circle" className="text-subtle mx-auto h-8 w-8" />
                  <p className="text-subtle mt-2 text-sm">
                    {callStatus === "idle"
                      ? t("start_call_to_see_conversation")
                      : t("waiting_for_conversation")}
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
                        {entry.speaker === "agent" ? t("ai_agent") : t("you")}
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
              <Icon name="triangle-alert" className="text-error h-6 w-6" />
              <span className="text-error text-sm">{error}</span>
            </div>
          </div>
        )}

        <DialogFooter showDivider className="mt-6">
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
              <Tooltip content={!hasCredits ? t("credits_required_tooltip") : undefined}>
                <Button
                  type="button"
                  onClick={handleStartCall}
                  loading={createWebCallMutation.isPending || callStatus === "connecting"}
                  disabled={!hasCredits || createWebCallMutation.isPending || callStatus === "connecting"}>
                  <Icon name="phone" className="mr-2 h-4 w-4" />
                  {callStatus === "connecting" ? t("connecting") : t("start_web_call")}
                </Button>
              </Tooltip>
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
