"use client";

import { useEffect, useRef } from "react";

export function NotificationSoundHandler() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  useEffect(() => {
    // Initialize audio context on component mount
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Pre-load and decode the audio file
    fetch("/sample-12s.mp3")
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => audioContextRef.current!.decodeAudioData(arrayBuffer))
      .then((audioBuffer) => {
        audioBufferRef.current = audioBuffer;
        console.log("Audio buffer loaded");
      })
      .catch((error) => console.error("Error loading audio:", error));

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const messageHandler = async (event: MessageEvent) => {
      console.log("message", event);
      if (event.data.type === "PLAY_NOTIFICATION_SOUND") {
        try {
          if (!audioContextRef.current || !audioBufferRef.current) return;

          // Resume audio context if suspended
          if (audioContextRef.current.state === "suspended") {
            await audioContextRef.current.resume();
          }

          // Stop any currently playing sound
          if (sourceRef.current) {
            sourceRef.current.stop();
          }

          // Create and play new sound
          const source = audioContextRef.current.createBufferSource();
          source.buffer = audioBufferRef.current;
          source.connect(audioContextRef.current.destination);
          sourceRef.current = source;
          source.start(0);

          // Cleanup after playing
          source.onended = () => {
            sourceRef.current = null;
          };
        } catch (error) {
          console.error("Error playing notification sound:", error);
        }
      }
    };

    navigator.serviceWorker.addEventListener("message", messageHandler);
    return () => navigator.serviceWorker.removeEventListener("message", messageHandler);
  }, []);

  return null;
}
