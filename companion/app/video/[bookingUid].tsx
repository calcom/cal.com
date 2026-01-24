/**
 * Video Call Screen
 *
 * This screen handles deep links from app.cal.com/video/* URLs and joins
 * Daily.co video calls natively using the Daily React Native SDK.
 */
import Daily, {
  DailyCall,
  DailyParticipant,
  DailyMediaView,
} from "@daily-co/react-native-daily-js";
import type { MediaStreamTrack as DailyMediaStreamTrack } from "@daily-co/react-native-webrtc";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

import { useBookingByUid } from "@/hooks/useBookings";
import { showErrorAlert } from "@/utils/alerts";

type CallState = "idle" | "joining" | "joined" | "leaving" | "error";

interface ParticipantTile {
  sessionId: string;
  userName: string;
  videoTrack: DailyMediaStreamTrack | null;
  audioTrack: DailyMediaStreamTrack | null;
  isLocal: boolean;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
}

export default function VideoCallScreen() {
  const { bookingUid } = useLocalSearchParams<{ bookingUid: string }>();
  const router = useRouter();

  // Fetch booking to get the meeting URL
  const {
    data: booking,
    isLoading: isLoadingBooking,
    error: bookingError,
  } = useBookingByUid(bookingUid);

  // Daily call state
  const callObjectRef = useRef<DailyCall | null>(null);
  const [callState, setCallState] = useState<CallState>("idle");
  const [participants, setParticipants] = useState<Map<string, ParticipantTile>>(new Map());
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Extract meeting URL from booking
  const meetingUrl = booking?.meetingUrl || booking?.location;

  // Check if the URL is a valid Daily.co URL
  const isValidDailyUrl = useCallback((url: string | undefined): boolean => {
    if (!url) return false;
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes("daily.co") || urlObj.hostname.includes("cal.com/video");
    } catch {
      return false;
    }
  }, []);

  // Convert Daily participant to our tile format
  const participantToTile = useCallback((participant: DailyParticipant): ParticipantTile => {
    return {
      sessionId: participant.session_id,
      userName: participant.user_name || "Guest",
      videoTrack: (participant.tracks?.video?.persistentTrack as DailyMediaStreamTrack) || null,
      audioTrack: (participant.tracks?.audio?.persistentTrack as DailyMediaStreamTrack) || null,
      isLocal: participant.local,
      isVideoEnabled: participant.tracks?.video?.state === "playable",
      isAudioEnabled: participant.tracks?.audio?.state === "playable",
    };
  }, []);

  // Update participants state
  const updateParticipants = useCallback(() => {
    const callObject = callObjectRef.current;
    if (!callObject) return;

    const dailyParticipants = callObject.participants();
    const newParticipants = new Map<string, ParticipantTile>();

    Object.values(dailyParticipants).forEach((participant) => {
      newParticipants.set(participant.session_id, participantToTile(participant));
    });

    setParticipants(newParticipants);
  }, [participantToTile]);

  // Handle Daily events
  const handleJoinedMeeting = useCallback(() => {
    setCallState("joined");
    updateParticipants();
  }, [updateParticipants]);

  const handleParticipantJoined = useCallback(() => {
    updateParticipants();
  }, [updateParticipants]);

  const handleParticipantLeft = useCallback(() => {
    updateParticipants();
  }, [updateParticipants]);

  const handleParticipantUpdated = useCallback(() => {
    updateParticipants();
  }, [updateParticipants]);

  const handleError = useCallback((event: { errorMsg?: string }) => {
    setCallState("error");
    setErrorMessage(event.errorMsg || "An error occurred during the call");
  }, []);

  const handleLeftMeeting = useCallback(() => {
    setCallState("idle");
    setParticipants(new Map());
    router.back();
  }, [router]);

  // Initialize and join the call
  const joinCall = useCallback(async () => {
    if (!meetingUrl || !isValidDailyUrl(meetingUrl)) {
      setErrorMessage("Invalid meeting URL");
      setCallState("error");
      return;
    }

    try {
      setCallState("joining");

      // Create call object if it doesn't exist
      if (!callObjectRef.current) {
        callObjectRef.current = Daily.createCallObject();
      }

      const callObject = callObjectRef.current;

      // Set up event listeners
      callObject.on("joined-meeting", handleJoinedMeeting);
      callObject.on("participant-joined", handleParticipantJoined);
      callObject.on("participant-left", handleParticipantLeft);
      callObject.on("participant-updated", handleParticipantUpdated);
      callObject.on("error", handleError);
      callObject.on("left-meeting", handleLeftMeeting);

      // Join the call
      await callObject.join({ url: meetingUrl });
    } catch (error) {
      setCallState("error");
      setErrorMessage(error instanceof Error ? error.message : "Failed to join call");
    }
  }, [
    meetingUrl,
    isValidDailyUrl,
    handleJoinedMeeting,
    handleParticipantJoined,
    handleParticipantLeft,
    handleParticipantUpdated,
    handleError,
    handleLeftMeeting,
  ]);

  // Leave the call
  const leaveCall = useCallback(async () => {
    const callObject = callObjectRef.current;
    if (!callObject) {
      router.back();
      return;
    }

    try {
      setCallState("leaving");
      await callObject.leave();
      await callObject.destroy();
      callObjectRef.current = null;
    } catch (error) {
      console.error("Error leaving call:", error);
    }

    router.back();
  }, [router]);

  // Toggle microphone
  const toggleMic = useCallback(async () => {
    const callObject = callObjectRef.current;
    if (!callObject) return;

    try {
      await callObject.setLocalAudio(!isMicEnabled);
      setIsMicEnabled(!isMicEnabled);
    } catch (error) {
      console.error("Error toggling microphone:", error);
    }
  }, [isMicEnabled]);

  // Toggle camera
  const toggleCamera = useCallback(async () => {
    const callObject = callObjectRef.current;
    if (!callObject) return;

    try {
      await callObject.setLocalVideo(!isCameraEnabled);
      setIsCameraEnabled(!isCameraEnabled);
    } catch (error) {
      console.error("Error toggling camera:", error);
    }
  }, [isCameraEnabled]);

  // Auto-join when meeting URL is available
  useEffect(() => {
    if (meetingUrl && callState === "idle" && isValidDailyUrl(meetingUrl)) {
      joinCall();
    }
  }, [meetingUrl, callState, isValidDailyUrl, joinCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const callObject = callObjectRef.current;
      if (callObject) {
        callObject.leave().catch(console.error);
        callObject.destroy().catch(console.error);
        callObjectRef.current = null;
      }
    };
  }, []);

  // Handle booking error
  useEffect(() => {
    if (bookingError) {
      showErrorAlert("Error", "Failed to load booking details");
    }
  }, [bookingError]);

  // Render loading state
  if (isLoadingBooking) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading meeting...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (callState === "error" || !meetingUrl || !isValidDailyUrl(meetingUrl)) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>
            {errorMessage || "This booking does not have a valid video meeting URL"}
          </Text>
          <Pressable style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Render joining state
  if (callState === "joining") {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Joining call...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Get local and remote participants
  const participantArray = Array.from(participants.values());
  const localParticipant = participantArray.find((p) => p.isLocal);
  const remoteParticipants = participantArray.filter((p) => !p.isLocal);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Video Grid */}
      <View style={styles.videoGrid}>
        {/* Remote participants */}
        {remoteParticipants.length > 0 ? (
          remoteParticipants.map((participant) => (
            <View key={participant.sessionId} style={styles.remoteVideoContainer}>
              {participant.videoTrack ? (
                <DailyMediaView
                  videoTrack={participant.videoTrack}
                  audioTrack={participant.audioTrack}
                  mirror={false}
                  zOrder={0}
                  style={styles.remoteVideo}
                />
              ) : (
                <View style={styles.videoPlaceholder}>
                  <Text style={styles.participantInitial}>
                    {participant.userName?.charAt(0).toUpperCase() || "?"}
                  </Text>
                </View>
              )}
              <View style={styles.participantNameContainer}>
                <Text style={styles.participantName}>{participant.userName}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.waitingContainer}>
            <Text style={styles.waitingText}>Waiting for others to join...</Text>
          </View>
        )}

        {/* Local participant (picture-in-picture) */}
        {localParticipant && (
          <View style={styles.localVideoContainer}>
            {localParticipant.videoTrack && isCameraEnabled ? (
              <DailyMediaView
                videoTrack={localParticipant.videoTrack}
                audioTrack={null}
                mirror={true}
                zOrder={1}
                style={styles.localVideo}
              />
            ) : (
              <View style={[styles.videoPlaceholder, styles.localVideoPlaceholder]}>
                <Text style={styles.participantInitial}>You</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <Pressable
          style={[styles.controlButton, !isMicEnabled && styles.controlButtonDisabled]}
          onPress={toggleMic}
        >
          <Text style={styles.controlButtonText}>{isMicEnabled ? "Mute" : "Unmute"}</Text>
        </Pressable>

        <Pressable
          style={[styles.controlButton, !isCameraEnabled && styles.controlButtonDisabled]}
          onPress={toggleCamera}
        >
          <Text style={styles.controlButtonText}>
            {isCameraEnabled ? "Camera Off" : "Camera On"}
          </Text>
        </Pressable>

        <Pressable style={[styles.controlButton, styles.leaveButton]} onPress={leaveCall}>
          <Text style={[styles.controlButtonText, styles.leaveButtonText]}>Leave</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#fff",
  },
  errorText: {
    fontSize: 16,
    color: "#ff6b6b",
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#000",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  videoGrid: {
    flex: 1,
    position: "relative",
  },
  remoteVideoContainer: {
    flex: 1,
    position: "relative",
  },
  remoteVideo: {
    flex: 1,
    backgroundColor: "#2a2a2a",
  },
  localVideoContainer: {
    position: "absolute",
    bottom: 100,
    right: 16,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#fff",
  },
  localVideo: {
    flex: 1,
    backgroundColor: "#2a2a2a",
  },
  videoPlaceholder: {
    flex: 1,
    backgroundColor: "#3a3a3a",
    justifyContent: "center",
    alignItems: "center",
  },
  localVideoPlaceholder: {
    backgroundColor: "#4a4a4a",
  },
  participantInitial: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#fff",
  },
  participantNameContainer: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  participantName: {
    color: "#fff",
    fontSize: 14,
  },
  waitingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  waitingText: {
    fontSize: 18,
    color: "#888",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 16,
    backgroundColor: "#1a1a1a",
  },
  controlButton: {
    backgroundColor: "#3a3a3a",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 80,
    alignItems: "center",
  },
  controlButtonDisabled: {
    backgroundColor: "#ff6b6b",
  },
  controlButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  leaveButton: {
    backgroundColor: "#ff4444",
  },
  leaveButtonText: {
    color: "#fff",
  },
});
