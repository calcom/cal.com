"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    Tally?: {
      loadEmbeds: () => void;
    };
  }
}

interface TallyFormProps {
  className?: string;
}

export const TallyForm = ({ className = "" }: TallyFormProps) => {
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    // Load embeds once when script is ready
    if (window.Tally && !scriptLoadedRef.current) {
      scriptLoadedRef.current = true;
      window.Tally.loadEmbeds();
    }
  }, []);

  return (
    <div className={`relative h-full w-full ${className}`}>
      <iframe
        data-tally-src="https://tally.so/r/wM95lY?transparentBackground=1&dynamicHeight=1"
        width="100%"
        height="800"
        title="Tally Form"
        allow="clipboard-write"
        style={{ border: "none", width: "100%", height: "800px" }}
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
