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
    // Set a timeout to detect loading failures
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

    // Reload the iframe by recreating it
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
    <div className="fixed right-[30px] top-1/2 z-[999] -mt-[200px] hidden h-[415px] w-[276px] rounded-lg bg-black/80 sm:block">
      <div className="flex h-[40px] items-center justify-between p-2">
        <h3 className="font-medium text-white">{t("play_while_you_wait")}</h3>
        <Button variant="icon" color="minimal" onClick={onClose} StartIcon="x" className="size-8" />
      </div>
      <div className="relative h-[calc(100%-40px)] w-full overflow-hidden">
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="loader" />
          </div>
        )}
        {hasError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4">
            <Icon name="triangle-alert" className="mb-2 h-8 w-8 text-yellow-500" />
            <p className="text-center text-white">{t("game_load_error")}</p>
            <Button color="secondary" StartIcon="refresh-cw" className="mt-4" onClick={handleRetry}>
              {t("try_again")}
            </Button>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src="https://cal.games"
            className="h-[415px] w-[276px]"
            title={t("play_while_you_wait")}
            onLoad={handleLoad}
            sandbox="allow-scripts allow-same-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
          />
        )}
      </div>
    </div>
  );
};
