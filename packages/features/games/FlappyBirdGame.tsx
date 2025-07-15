import { useEffect, useRef, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

interface FlappyBirdGameProps {
  onClose: () => void;
}

export const FlappyBirdGame = ({ onClose }: FlappyBirdGameProps) => {
  const { t } = useLocale();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const loadTimeoutRef = useRef<NodeJS.Timeout>();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    loadTimeoutRef.current = setTimeout(() => {
      if (isLoading) {
        setHasError(true);
        setIsLoading(false);
        showToast(t("game_load_error"), "error");
      }
    }, 10000); // 10 second timeout

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [isLoading, t]);

  const handleLoad = () => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    setIsLoading(false);
  };

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);

    if (iframeRef.current) {
      const src = iframeRef.current.src;
      iframeRef.current.src = "";
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = src;
        }
      }, 100);
    }
  };

  return (
    <div className="no-scrollbar fixed right-4 top-1/2 z-[999] hidden h-[415px] w-[276px] -translate-y-1/2 overflow-hidden rounded-lg bg-black/80 shadow-lg lg:block xl:right-[30px]">
      <div className="flex h-[40px] items-center justify-between bg-black/90 p-2">
        <h3 className="text-sm font-medium text-white">{t("play_while_you_wait")}</h3>
        <Button
          variant="icon"
          color="minimal"
          onClick={onClose}
          StartIcon="x"
          className="size-8 text-white hover:bg-white/10"
        />
      </div>
      <div className="no-scrollbar relative h-[calc(100%-40px)] w-full overflow-hidden">
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="loader" />
          </div>
        )}
        {hasError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4 text-center">
            <Icon name="triangle-alert" className="mb-2 h-8 w-8 text-yellow-500" />
            <p className="text-center text-sm text-white">{t("game_load_error")}</p>
            <Button color="secondary" StartIcon="refresh-cw" className="mt-4" onClick={handleRetry}>
              {t("try_again")}
            </Button>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src="https://cal.games"
            className="no-scrollbar h-full w-full border-0"
            title={t("play_while_you_wait")}
            onLoad={handleLoad}
            sandbox="allow-scripts allow-same-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
            style={{
              border: "none",
              overflow: "hidden",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          />
        )}
      </div>
    </div>
  );
};
