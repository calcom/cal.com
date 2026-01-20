"use client";

import { useEffect, useRef } from "react";

export function NotificationSoundHandler() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  const initializeAudioSystem = async () => {
    try {
      // Only create a new context if we don't have one or if it's closed
      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      if (!audioBufferRef.current) {
        const response = await fetch("/ring.mp3");
        const arrayBuffer = await response.arrayBuffer();
        audioBufferRef.current = await audioContextRef.current.decodeAudioData(arrayBuffer);
      }

      return true;
    } catch (error) {
      console.error("Failed to initialize audio system:", error);
      return false;
    }
  };

  const playSound = async () => {
    try {
      // Ensure audio system is initialized
      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        const initialized = await initializeAudioSystem();
        if (!initialized) return;
      }

      if (!audioContextRef.current) return;

      // Resume context if suspended
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      // Stop any currently playing sound
      if (sourceRef.current) {
        sourceRef.current.stop();
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }

      // Create and play new sound
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.connect(audioContextRef.current.destination);
      sourceRef.current = source;

      source.loop = true;
      source.start(0);

      setTimeout(() => {
        if (sourceRef.current === source) {
          source.stop();
          source.disconnect();
          sourceRef.current = null;
        }
      }, 7000);
    } catch (error) {
      console.error("Error playing sound:", error);
      // Try to reinitialize on error
      audioContextRef.current = null;
      audioBufferRef.current = null;
    }
  };

  const stopSound = () => {
    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
  };

  useEffect(() => {
    // Don't automatically initialize - wait for user interaction
    return () => {
      stopSound();
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
      audioBufferRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      console.warn("ServiceWorker not available");
      return;
    }

    const messageHandler = async (event: MessageEvent) => {
      if (event.data.type === "PLAY_NOTIFICATION_SOUND") {
        // Only initialize if not already initialized
        if (!audioBufferRef.current) {
          await initializeAudioSystem();
        }
        await playSound();
      }

      if (event.data.type === "STOP_NOTIFICATION_SOUND") {
        stopSound();
      }
    };

    navigator.serviceWorker.addEventListener("message", messageHandler);
    return () => navigator.serviceWorker.removeEventListener("message", messageHandler);
  }, []);

  // Single click handler for initial audio setup
  useEffect(() => {
    const handleFirstInteraction = async () => {
      // Only initialize if not already initialized
      if (!audioBufferRef.current) {
        await initializeAudioSystem();
      }
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("touchstart", handleFirstInteraction);
    };

    document.addEventListener("click", handleFirstInteraction);
    document.addEventListener("touchstart", handleFirstInteraction);

    return () => {
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("touchstart", handleFirstInteraction);
    };
  }, []);

  return null;
}
