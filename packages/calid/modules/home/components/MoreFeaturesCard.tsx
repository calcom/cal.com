"use client";

import { Badge } from "@calid/features/ui/components/badge";
import { Button } from "@calid/features/ui/components/button";
import { Icon } from "@calid/features/ui/components/icon";
import { useState, useMemo, useEffect, useRef } from "react";

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
      className={`bg-default relative flex flex-row gap-4 overflow-hidden rounded-2xl border p-6 transition-all duration-300 ${
        shouldBeClickable ? "cursor-pointer hover:scale-105" : ""
      }`}
      onClick={shouldBeClickable ? handleClick : undefined}>
      <div className="flex flex-shrink-0 justify-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
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
  const [isSliding, setIsSliding] = useState(false);
  const [nextCardIndex, setNextCardIndex] = useState(1);
  const row1CardIndexRef = useRef(0);

  useEffect(() => {
    row1CardIndexRef.current = row1CardIndex;
  }, [row1CardIndex]);

  useEffect(() => {
    if (newFeatureCardContent.length === 0) return;

    const interval = setInterval(() => {
      setIsSliding(true);
      const nextIndex = (row1CardIndexRef.current + 1) % newFeatureCardContent.length;
      setNextCardIndex(nextIndex);

      setTimeout(() => {
        row1CardIndexRef.current = nextIndex;
        setRow1CardIndex(nextIndex);
        setIsSliding(false);
      }, 600);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleCardClick = (
    positionIndex: number,
    currentCardIndex: number,
    rowType: "row2" | "row3",
    pageSlug?: string
  ) => {
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
    <div className="border-default flex w-full flex-col items-center rounded-3xl border px-4 py-8 shadow-md">
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
        <div className="relative w-full overflow-hidden">
          <div className="invisible">
            {newFeatureCardContent[row1CardIndex] && (
              <Card
                {...newFeatureCardContent[row1CardIndex]}
                isClickable={!!newFeatureCardContent[row1CardIndex].pageSlug}
              />
            )}
          </div>
          <div
            className={`duration-600 absolute inset-x-0 top-0 transition-all ease-in-out ${
              isSliding ? "-translate-x-full opacity-0" : "translate-x-0 opacity-100"
            }`}
            style={{ transitionDuration: "600ms" }}>
            {newFeatureCardContent[row1CardIndex] && (
              <Card
                key={`row1-current-${row1CardIndex}`}
                {...newFeatureCardContent[row1CardIndex]}
                isClickable={!!newFeatureCardContent[row1CardIndex].pageSlug}
              />
            )}
          </div>
          <div
            className={`duration-600 absolute inset-x-0 top-0 transition-all ease-in-out ${
              isSliding ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
            }`}
            style={{ transitionDuration: "600ms" }}>
            {newFeatureCardContent[nextCardIndex] && (
              <Card
                key={`row1-next-${nextCardIndex}`}
                {...newFeatureCardContent[nextCardIndex]}
                isClickable={!!newFeatureCardContent[nextCardIndex].pageSlug}
              />
            )}
          </div>
        </div>

        {rows.row2.length > 0 && (
          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
            {rows.row2.map((card) => {
              const { originalIndex, positionIndex, ...cardProps } = card;
              return (
                <Card
                  key={`row2-${originalIndex}-${positionIndex}`}
                  {...cardProps}
                  onClick={() => handleCardClick(positionIndex, originalIndex, "row2", cardProps.pageSlug)}
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
                  onClick={() => handleCardClick(positionIndex, originalIndex, "row3", cardProps.pageSlug)}
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
