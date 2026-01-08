"use client";

import { useState } from "react";

import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@calcom/ui/components/popover";

const MAX_VISIBLE_BADGES = 2;

type LimitedBadgesProps<T> = {
  items: T[];
  renderBadge: (item: T, index: number) => React.ReactNode;
  renderOverflowItem: (item: T, index: number) => React.ReactNode;
  maxVisible?: number;
  className?: string;
};

export function LimitedBadges<T>({
  items,
  renderBadge,
  renderOverflowItem,
  maxVisible = MAX_VISIBLE_BADGES,
  className,
}: LimitedBadgesProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  if (items.length === 0) return null;

  const visibleItems = items.slice(0, maxVisible);
  const hiddenItems = items.slice(maxVisible);
  const hasHiddenItems = hiddenItems.length > 0;

  const handleMouseEnter = () => {
    if (!isMobile) {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setIsOpen(false);
    }
  };

  return (
    <div className={className}>
      {visibleItems.map((item, index) => renderBadge(item, index))}
      {hasHiddenItems && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="icon"
              color="minimal"
              className="h-auto p-0"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}>
              <Badge variant="gray">+{hiddenItems.length}</Badge>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="bottom"
            align="start"
            className="w-fit p-2"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}>
            <div className="flex flex-col gap-1">
              {hiddenItems.map((item, index) => renderOverflowItem(item, index))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
