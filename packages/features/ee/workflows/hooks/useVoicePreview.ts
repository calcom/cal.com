import { useState, useEffect, useRef } from "react";

import { showToast } from "@calcom/ui/components/toast";

export function useVoicePreview() {
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopCurrentAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
      audioRef.current = null;
    }
    setPlayingVoiceId(null);
  };

  const handlePlayVoice = (previewUrl?: string, voiceId?: string) => {
    if (!previewUrl) {
      showToast("Preview not available for this voice", "error");
      return;
    }

    if (playingVoiceId === voiceId) {
      stopCurrentAudio();
      return;
    }

    stopCurrentAudio();

    const audio = new Audio(previewUrl);

    audio.onended = () => {
      setPlayingVoiceId(null);
      setCurrentAudio(null);
      audioRef.current = null;
    };

    audio.onerror = () => {
      setPlayingVoiceId(null);
      setCurrentAudio(null);
      audioRef.current = null;
      showToast("Failed to play voice preview", "error");
    };

    setCurrentAudio(audio);
    audioRef.current = audio;

    audio.play()
      .then(() => {
        setPlayingVoiceId(voiceId || null);
      })
      .catch(() => {
        setPlayingVoiceId(null);
        setCurrentAudio(null);
        audioRef.current = null;
        showToast("Failed to play voice preview", "error");
      });
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, []);

  return {
    playingVoiceId,
    handlePlayVoice,
    stopCurrentAudio,
  };
}
