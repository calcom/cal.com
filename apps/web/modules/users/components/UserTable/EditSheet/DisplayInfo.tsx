import { useRef, useState } from "react";

import { Badge } from "@calcom/ui/components/badge";
import type { IconName } from "@calcom/ui/components/icon";
import { Icon } from "@calcom/ui/components/icon";
import { Tooltip } from "@calcom/ui/components/tooltip";

type DisplayInfoType = {
  label: string;
  icon?: IconName;
  value: string | string[];
  coloredBadges?: boolean;
  labelClassname?: string;
  valueClassname?: string;
};

const badgeColors = ["warning", "success", "green", "gray", "blue", "red", "error"] as const;

const valueDefaultClassname = "text-emphasis inline-flex items-center gap-1 font-medium leading-5";

export function DisplayInfo({
  label,
  icon,
  value,
  coloredBadges,
  labelClassname,
  valueClassname = valueDefaultClassname,
}: DisplayInfoType) {
  const displayAsBadges = Array.isArray(value);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(true);

  const handleScroll = () => {
    const element = scrollContainerRef.current;
    if (!element) return;

    setShowLeftGradient(element.scrollLeft > 0);

    const isAtEnd = Math.abs(element.scrollWidth - element.clientWidth - element.scrollLeft) < 1;
    setShowRightGradient(!isAtEnd);
  };

  return (
    <div className="flex items-center gap-6">
      <div className="flex w-[110px] items-center gap-2">
        {icon ? <Icon className="text-subtle h-4 w-4" name={icon} /> : null}
        <label className={labelClassname ? labelClassname : "text-subtle text-sm font-medium"}>{label}</label>
      </div>
      <div className="flex flex-1">
        {displayAsBadges ? (
          <div className="flex flex-wrap gap-2">
            {value.map((v, idx) => {
              return coloredBadges ? (
                <Badge variant={badgeColors[idx % badgeColors.length]} key={v}>
                  {v}
                </Badge>
              ) : (
                <Badge variant="gray" key={v}>
                  {v}
                </Badge>
              );
            })}
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <div className="relative max-w-[280px]">
              <Tooltip content={value}>
                <div
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                  className="no-scrollbar overflow-x-auto">
                  <span className={`${valueClassname} whitespace-nowrap`}>{value}</span>
                </div>
              </Tooltip>
              {showLeftGradient && (
                <div className="from-default pointer-events-none absolute left-0 top-0 h-full w-8 bg-linear-to-r to-transparent" />
              )}
              {showRightGradient && (
                <div className="from-default pointer-events-none absolute right-0 top-0 h-full w-8 bg-linear-to-l to-transparent" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
