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
    <div className="no-scrollbar fixed right-2 top-1/2 z-[999] hidden -translate-y-1/2 overflow-hidden rounded-lg bg-black/80 shadow-lg sm:right-4 sm:block sm:h-[350px] sm:w-[240px] md:h-[380px] md:w-[260px] lg:h-[415px] lg:w-[276px] xl:right-[30px] 2xl:h-[450px] 2xl:w-[300px]">
      <div className="flex items-center justify-between bg-black/90 p-1.5 sm:h-[36px] sm:p-2 lg:h-[40px]">
        <h3 className="text-xs font-medium text-white sm:text-sm">{t("play_while_you_wait")}</h3>
        <Button
          variant="icon"
          color="minimal"
          onClick={onClose}
          StartIcon="x"
          className="size-6 sm:size-7 lg:size-8 text-white hover:bg-white/10"
        />
      </div>
      <div className="no-scrollbar relative h-[calc(100%-32px)] w-full overflow-hidden sm:h-[calc(100%-36px)] lg:h-[calc(100%-40px)]">
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="loader" />
          </div>
        )}
        {hasError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-2 text-center sm:p-4">
            <Icon name="triangle-alert" className="mb-1 h-6 w-6 text-yellow-500 sm:mb-2 sm:h-8 sm:w-8" />
            <p className="text-center text-xs text-white sm:text-sm">{t("game_load_error")}</p>
            <Button
              color="secondary"
              StartIcon="refresh-cw"
              className="mt-2 text-xs sm:mt-4 sm:text-sm"
              onClick={handleRetry}>
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
