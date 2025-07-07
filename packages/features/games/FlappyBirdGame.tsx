import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

interface FlappyBirdGameProps {
  onClose: () => void;
}

export const FlappyBirdGame = ({ onClose }: FlappyBirdGameProps) => {
  const { t } = useLocale();
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    showToast("Failed to load the game. Please try again later.", "error");
  };

  if (!isVisible) return null;

  return (
    <div className="game-container fixed right-[30px] top-1/2 z-[999] -mt-[200px] h-[415px] w-[276px] rounded-lg max-sm:right-[10px] max-sm:-mt-[150px] max-sm:h-[300px] max-sm:w-[200px] sm:h-[415px] sm:w-[276px]">
      <div className="flex items-center justify-between rounded-t-lg bg-black/80 p-2">
        <h3 className="font-medium text-white">{t("flappy_bird_game")}</h3>
        <div className="flex gap-2">
          <Button
            variant="icon"
            color="minimal"
            onClick={() => setIsVisible(false)}
            StartIcon="x"
            className="h-8 w-8"
          />
          <Button variant="icon" color="minimal" onClick={onClose} StartIcon="x" className="h-8 w-8" />
        </div>
      </div>
      <div className="relative h-[calc(100%-40px)] w-full">
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center rounded-b-lg bg-black/80">
            <div className="loader" />
          </div>
        )}
        {hasError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-b-lg bg-black/80 p-4">
            <Icon name="triangle-alert" className="mb-2 h-8 w-8 text-yellow-500" />
            <p className="text-center text-white">{t("game_load_error")}</p>
            <Button
              color="secondary"
              StartIcon="refresh-cw"
              className="mt-4"
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
              }}>
              {t("try_again")}
            </Button>
          </div>
        ) : (
          <iframe
            src="https://cal.games"
            className="h-full w-full rounded-b-lg border-none"
            title="Flappy Bird Game"
            onLoad={() => setIsLoading(false)}
            onError={handleError}
          />
        )}
      </div>
    </div>
  );
};
