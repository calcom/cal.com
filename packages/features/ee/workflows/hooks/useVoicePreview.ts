import { useState } from "react";

import { showToast } from "@calcom/ui/components/toast";

export function useVoicePreview() {
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  const stopCurrentAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
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
    setCurrentAudio(audio);
    setPlayingVoiceId(voiceId || null);

    audio.play().catch(() => {
      setPlayingVoiceId(null);
      setCurrentAudio(null);
      showToast("Failed to play voice preview", "error");
    });

    audio.onended = () => {
      setPlayingVoiceId(null);
      setCurrentAudio(null);
    };

    audio.onerror = () => {
      setPlayingVoiceId(null);
      setCurrentAudio(null);
      showToast("Failed to play voice preview", "error");
    };
  };

  return {
    playingVoiceId,
    handlePlayVoice,
    stopCurrentAudio,
  };
}