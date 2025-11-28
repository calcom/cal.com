import { useState } from "react";

interface EventDescriptionProps {
  htmlContent: string;
}

export function EventDescription({ htmlContent }: EventDescriptionProps) {
  const [showGradient, setShowGradient] = useState(false);

  const checkOverflow = (node: HTMLDivElement | null) => {
    if (node) {
      setShowGradient(node.scrollHeight > node.clientHeight);
    }
  };

  return (
    <div className="relative">
      <div
        ref={checkOverflow}
        className="wrap-break-word scroll-bar max-h-[180px] max-w-full overflow-y-auto pr-4"
        dangerouslySetInnerHTML={{
          __html: htmlContent,
        }}
      />
      {showGradient && (
        <div className="from-default pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t to-transparent" />
      )}
    </div>
  );
}
