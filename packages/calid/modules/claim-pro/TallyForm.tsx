"use client";

import { SkeletonContainer, SkeletonText } from "@calid/features/ui/components/skeleton";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    Tally?: {
      loadEmbeds: () => void;
    };
  }
}

interface TallyFormProps {
  formSubmittedForYear: number;
  userEmail?: string | null;
  onSubmission?: () => void;
}

export const TallyForm = ({ formSubmittedForYear, userEmail, onSubmission }: TallyFormProps) => {
  const scriptLoadedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const baseUrl = formSubmittedForYear == 1 ? "https://tally.so/r/mDrJKZ" : "https://tally.so/r/3qr859";

  const tallySrc = userEmail
    ? `${baseUrl}?formEventsForwarding=1&Email=${encodeURIComponent(userEmail)}`
    : `${baseUrl}?formEventsForwarding=1`;

  useEffect(() => {
    // Load embeds once when script is ready
    if (window.Tally && !scriptLoadedRef.current) {
      scriptLoadedRef.current = true;
      window.Tally.loadEmbeds();
    }
  }, []);

  useEffect(() => {
    // Reload embeds when tallySrc changes
    if (window.Tally) {
      window.Tally.loadEmbeds();
    }
  }, [tallySrc]);

  useEffect(() => {
    // Listen for Tally form submission events
    const handleTallySubmission = (event: MessageEvent) => {
      if (event.data?.includes?.("Tally.FormSubmitted")) {
        try {
          JSON.parse(event.data).payload;
          onSubmission?.();
        } catch (error) {
          onSubmission?.();
        }
      } else if (event.data?.type === "tally.formSubmitted") {
        onSubmission?.();
      } else if (event.data?.type === "Tally.FormSubmitted") {
        onSubmission?.();
      }
    };

    // Also listen for direct Tally events (for custom domain setups)
    const handleDirectTallyEvent = (event: CustomEvent) => {
      onSubmission?.();
    };

    window.addEventListener("message", handleTallySubmission);
    window.addEventListener("Tally.FormSubmitted", handleDirectTallyEvent as EventListener);

    return () => {
      window.removeEventListener("message", handleTallySubmission);
      window.removeEventListener("Tally.FormSubmitted", handleDirectTallyEvent as EventListener);
    };
  }, [onSubmission]);

  return (
    <div className="relative h-full w-full">
      {isLoading && (
        <div className="bg-default absolute inset-0 z-10 p-8">
          <SkeletonContainer>
            <div className="space-y-6">
              <div className="space-y-2">
                <SkeletonText className="h-8 w-64" />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <SkeletonText className="h-4 w-24" />
                  <SkeletonText className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <SkeletonText className="h-4 w-32" />
                  <SkeletonText className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <SkeletonText className="h-4 w-28" />
                  <SkeletonText className="h-20 w-full" />
                </div>
                <div className="space-y-2">
                  <SkeletonText className="h-4 w-36" />
                  <SkeletonText className="h-10 w-full" />
                </div>
              </div>

              <div className="pt-4">
                <SkeletonText className="h-12 w-32" />
              </div>
            </div>
          </SkeletonContainer>
        </div>
      )}

      <iframe
        key={tallySrc}
        data-tally-src={tallySrc}
        width="100%"
        height="1000"
        title="Tally Form"
        allow="clipboard-write"
        onLoad={() => setIsLoading(false)}
      />

      <Script
        id="tally-js"
        src="https://tally.so/widgets/embed.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (window.Tally) {
            window.Tally.loadEmbeds();
          }
        }}
      />
    </div>
  );
};
