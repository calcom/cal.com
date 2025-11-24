"use client";

import { Badge } from "@calid/features/ui/components/badge";
import { Button } from "@calid/features/ui/components/button";
import { Icon } from "@calid/features/ui/components/icon";
import { useState, useMemo, useEffect } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import type { Feature } from "../utils/featureCardContent";
import { featureCardContent, newFeatureCardContent } from "../utils/featureCardContent";

const Card = ({
  icon,
  title,
  description,
  onClick,
  isClickable,
  isNew,
  isComingSoon,
  pageSlug,
}: Feature & { onClick?: () => void; isClickable?: boolean }) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    if (pageSlug) {
      window.open(`${WEBAPP_URL}${pageSlug}`, "_blank");
    }
  };

  const shouldBeClickable = isClickable || !!pageSlug;

  return (
    <div
      className={`bg-default group relative flex flex-row gap-4 overflow-hidden rounded-md border p-6 transition-all duration-300 ${
        shouldBeClickable ? "cursor-pointer hover:scale-[1.02] hover:shadow-md" : ""
      }`}
      onClick={shouldBeClickable ? handleClick : undefined}>
      <div className="flex flex-shrink-0 justify-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 transition-transform duration-300 group-hover:scale-110">
          <Icon name={icon} className="h-5 w-5 text-blue-500" />
        </div>
      </div>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <div className="mb-1 flex items-center gap-2">
          <h3 className="text-default text-sm font-semibold">{title}</h3>
          {isNew && (
            <Badge variant="default" size="sm">
              New
            </Badge>
          )}
          {isComingSoon && (
            <Badge variant="default" size="sm">
              Coming Soon
            </Badge>
          )}
        </div>
        {description && <p className="text-default text-sm">{description}</p>}
      </div>
    </div>
  );
};

export function MoreFeatures() {
  const { t } = useLocale();
  const [visibleCardIndices, setVisibleCardIndices] = useState<number[]>(() => {
    const initialCount = Math.min(4, featureCardContent.length);
    return Array.from({ length: initialCount }, (_, i) => i);
  });

  const [row1CardIndex, setRow1CardIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (newFeatureCardContent.length <= 1) return;

    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setRow1CardIndex((prev) => (prev + 1) % newFeatureCardContent.length);
        setIsAnimating(false);
      }, 300);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleCardClick = (positionIndex: number, currentCardIndex: number, rowType: "row2" | "row3") => {
    setVisibleCardIndices((prev) => {
      const newIndices = [...prev];
      const allVisibleIndices = prev.filter((idx) => idx !== undefined);
      const availableIndices = featureCardContent
        .map((_, idx) => idx)
        .filter((idx) => !allVisibleIndices.includes(idx));

      if (availableIndices.length > 0) {
        const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];

        if (rowType === "row2") {
          newIndices[positionIndex] = randomIndex;
        } else {
          newIndices[positionIndex + 2] = randomIndex;
        }
      }
      return newIndices;
    });
  };

  const rows = useMemo(() => {
    const row2: (Feature & { originalIndex: number; positionIndex: number })[] = [];
    const row3: (Feature & { originalIndex: number; positionIndex: number })[] = [];

    if (visibleCardIndices[0] !== undefined) {
      row2.push({
        ...featureCardContent[visibleCardIndices[0]],
        originalIndex: visibleCardIndices[0],
        positionIndex: 0,
      });
    }
    if (visibleCardIndices[1] !== undefined) {
      row2.push({
        ...featureCardContent[visibleCardIndices[1]],
        originalIndex: visibleCardIndices[1],
        positionIndex: 1,
      });
    }

    if (visibleCardIndices[2] !== undefined) {
      row3.push({
        ...featureCardContent[visibleCardIndices[2]],
        originalIndex: visibleCardIndices[2],
        positionIndex: 0,
      });
    }
    if (visibleCardIndices[3] !== undefined) {
      row3.push({
        ...featureCardContent[visibleCardIndices[3]],
        originalIndex: visibleCardIndices[3],
        positionIndex: 1,
      });
    }

    return { row2, row3 };
  }, [visibleCardIndices]);

  return (
    <div className="border-default flex w-full flex-col items-center rounded-md border px-4 py-8">
      <div className="flex w-full flex-col gap-4">
        <div className="relative flex w-full items-center justify-between">
          <h2 className="text-default text-lg font-bold">{t("explore_more_features")}</h2>
          <div className="flex flex-1 justify-end">
            <Button
              color="secondary"
              size="sm"
              onClick={() => window.open("https://roadmap.cal.id", "_blank")}>
              {t("request_feature")}
            </Button>
          </div>
        </div>
        <div className="relative w-full">
          <div
            key={row1CardIndex}
            className={`transition-opacity duration-300 ease-in-out ${
              isAnimating ? "opacity-0" : "opacity-100"
            }`}>
            {newFeatureCardContent[row1CardIndex] && (
              <Card
                {...newFeatureCardContent[row1CardIndex]}
                isClickable={!!newFeatureCardContent[row1CardIndex].pageSlug}
              />
            )}
          </div>
        </div>
        {newFeatureCardContent.length > 1 && (
          <div className="flex items-center justify-center gap-2">
            {newFeatureCardContent.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  if (index !== row1CardIndex) {
                    setIsAnimating(true);
                    setTimeout(() => {
                      setRow1CardIndex(index);
                      setIsAnimating(false);
                    }, 300);
                  }
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === row1CardIndex
                    ? "w-8 bg-blue-500 dark:bg-gray-500"
                    : "w-2 bg-gray-300 hover:bg-gray-400"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}

        {rows.row2.length > 0 && (
          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
            {rows.row2.map((card) => {
              const { originalIndex, positionIndex, ...cardProps } = card;
              return (
                <Card
                  key={`row2-${originalIndex}-${positionIndex}`}
                  {...cardProps}
                  onClick={() => handleCardClick(positionIndex, originalIndex, "row2")}
                  isClickable={true}
                />
              );
            })}
          </div>
        )}

        {rows.row3.length > 0 && (
          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
            {rows.row3.map((card) => {
              const { originalIndex, positionIndex, ...cardProps } = card;
              return (
                <Card
                  key={`row3-${originalIndex}-${positionIndex}`}
                  {...cardProps}
                  onClick={() => handleCardClick(positionIndex, originalIndex, "row3")}
                  isClickable={true}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
