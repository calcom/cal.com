"use client";

import { Button } from "@calcom/ui/components/button";

type Props = {
  videoCallUrl?: string | null;
};

export function JoinVideoCallButton({ videoCallUrl }: Props) {
  if (!videoCallUrl) return null;

  return (
    <Button
      as="a"
      href={videoCallUrl}
      target="_blank"
      rel="noopener noreferrer"
      color="primary"
      data-testid="join-video-call-button"
    >
      Join Video Call
    </Button>
  );
}
