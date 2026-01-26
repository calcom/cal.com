"use no memo";
/**
 * Video Call Screen
 *
 * This screen handles deep links from app.cal.com/video/* URLs and joins
 * Daily.co video calls natively using the Daily React Native SDK.
 *
 * The Daily SDK is loaded dynamically to prevent crashes in environments
 * where native modules aren't available (like Expo Go or web).
 *
 * Note: "use no memo" directive excludes this file from React Compiler
 * because dynamic import() expressions are not yet supported.
 */
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useBookingByUid } from "@/hooks/useBookings";
import { showErrorAlert } from "@/utils/alerts";

type CallState = "idle" | "joining" | "joined" | "leaving" | "error" | "unsupported";

type DailyModule = typeof import("@daily-co/react-native-daily-js");
type DailyCallType = ReturnType<DailyModule["default"]["createCallObject"]>;

interface ParticipantTile {
  sessionId: string;
  userName: string;
  videoTrack: unknown;
  audioTrack: unknown;
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

  // Daily SDK and call state
  const dailyModuleRef = useRef<DailyModule | null>(null);
  const callObjectRef = useRef<DailyCallType | null>(null);
  const [callState, setCallState] = useState<CallState>("idle");
  const [participants, setParticipants] = useState<Map<string, ParticipantTile>>(new Map());
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [DailyMediaView, setDailyMediaView] = useState<DailyModule["DailyMediaView"] | null>(null);

  // Extract meeting URL from booking
  const meetingUrl = booking?.meetingUrl || booking?.location;

  // Check if the URL is a valid Daily.co URL
  const isValidDailyUrl = useCallback((url: string | undefined): boolean => {
    if (!url) return false;
    let urlObj: URL | null = null;
    try {
      urlObj = new URL(url);
    } catch {
      return false;
    }
    // Logic must be outside try/catch for React Compiler compatibility
    // Use strict hostname matching to prevent domain spoofing (e.g., cal.com.evil.com)
    const hostname = urlObj.hostname;
    const isDailyUrl = hostname === "daily.co" || hostname.endsWith(".daily.co");
    const isCalVideoUrl =
      (hostname === "cal.com" || hostname.endsWith(".cal.com")) &&
      urlObj.pathname.startsWith("/video/");
    return isDailyUrl || isCalVideoUrl;
  }, []);

  // Convert Daily participant to our tile format
  const participantToTile = useCallback(
    (participant: {
      session_id: string;
      user_name?: string;
      tracks?: {
        video?: { persistentTrack?: unknown; state?: string };
        audio?: { persistentTrack?: unknown; state?: string };
      };
      local: boolean;
    }): ParticipantTile => {
      return {
        sessionId: participant.session_id,
        userName: participant.user_name || "Guest",
        videoTrack: participant.tracks?.video?.persistentTrack || null,
        audioTrack: participant.tracks?.audio?.persistentTrack || null,
        isLocal: participant.local,
        isVideoEnabled: participant.tracks?.video?.state === "playable",
        isAudioEnabled: participant.tracks?.audio?.state === "playable",
      };
    },
    []
  );

  // Update participants state
  const updateParticipants = useCallback(() => {
    const callObject = callObjectRef.current;
    if (!callObject) return;

    const dailyParticipants = callObject.participants();
    const newParticipants = new Map<string, ParticipantTile>();

    Object.values(dailyParticipants).forEach((participant) => {
      const p = participant as {
        session_id: string;
        user_name?: string;
        tracks?: {
          video?: { persistentTrack?: unknown; state?: string };
          audio?: { persistentTrack?: unknown; state?: string };
        };
        local: boolean;
      };
      newParticipants.set(p.session_id, participantToTile(p));
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

  // Load Daily SDK dynamically
  const loadDailySDK = useCallback(async (): Promise<DailyModule | null> => {
    if (dailyModuleRef.current) {
      return dailyModuleRef.current;
    }

    if (Platform.OS === "web") {
      setCallState("unsupported");
      setErrorMessage(
        "Video calls are not supported in the web version. Please use the mobile app."
      );
      return null;
    }

    try {
      const Daily = await import("@daily-co/react-native-daily-js");
      dailyModuleRef.current = Daily;
      setDailyMediaView(() => Daily.DailyMediaView);
      return Daily;
    } catch (error) {
      console.error("Failed to load Daily SDK:", error);
      setCallState("unsupported");
      setErrorMessage(
        "Video calls require a development build. Please rebuild the app with native modules."
      );
      return null;
    }
  }, []);

  // Initialize and join the call
  const joinCall = useCallback(async () => {
    if (!meetingUrl || !isValidDailyUrl(meetingUrl)) {
      setErrorMessage("Invalid meeting URL");
      setCallState("error");
      return;
    }

    try {
      setCallState("joining");

      // Load Daily SDK dynamically
      const Daily = await loadDailySDK();
      if (!Daily) {
        return;
      }

      // Create call object if it doesn't exist
      if (!callObjectRef.current) {
        callObjectRef.current = Daily.default.createCallObject();
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
    loadDailySDK,
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

  // Open meeting URL in browser as fallback
  const openInBrowser = useCallback(() => {
    if (meetingUrl) {
      Linking.openURL(meetingUrl);
    }
  }, [meetingUrl]);

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

  // Render unsupported state (Expo Go, web, etc.)
  if (callState === "unsupported") {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          {meetingUrl && (
            <Pressable style={styles.button} onPress={openInBrowser}>
              <Text style={styles.buttonText}>Open in Browser</Text>
            </Pressable>
          )}
          <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Go Back</Text>
          </Pressable>
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
              {participant.videoTrack && DailyMediaView ? (
                <DailyMediaView
                  videoTrack={
                    participant.videoTrack as Parameters<typeof DailyMediaView>[0]["videoTrack"]
                  }
                  audioTrack={
                    participant.audioTrack as Parameters<typeof DailyMediaView>[0]["audioTrack"]
                  }
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
            {localParticipant.videoTrack && isCameraEnabled && DailyMediaView ? (
              <DailyMediaView
                videoTrack={
                  localParticipant.videoTrack as Parameters<typeof DailyMediaView>[0]["videoTrack"]
                }
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
    marginTop: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#666",
  },
  secondaryButtonText: {
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
