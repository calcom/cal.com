"use client";

import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@calcom/ui/components/popover";
import { useCallback, useMemo, useState } from "react";

const MAX_VISIBLE_BADGES = 2;

type BadgeItem = {
  label: string;
  variant?:
    | "default"
    | "warning"
    | "orange"
    | "success"
    | "green"
    | "gray"
    | "blue"
    | "red"
    | "error"
    | "grayWithoutHover"
    | "purple";
  onClick?: () => void;
};

type LimitedBadgesProps = {
  items: BadgeItem[];
  maxVisible?: number;
  className?: string;
};

function LimitedBadges({
  items,
  maxVisible = MAX_VISIBLE_BADGES,
  className,
}: LimitedBadgesProps): JSX.Element | null {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const { visibleItems, hiddenItems } = useMemo(
    () => ({
      visibleItems: items.slice(0, maxVisible),
      hiddenItems: items.slice(maxVisible),
    }),
    [items, maxVisible]
  );

  const handleMouseEnter = useCallback(() => {
    if (!isMobile) {
      setIsOpen(true);
    }
  }, [isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (!isMobile) {
      setIsOpen(false);
    }
  }, [isMobile]);

  if (items.length === 0) return null;

  const hasHiddenItems = hiddenItems.length > 0;

  return (
    <div className={`flex flex-wrap items-center gap-x-1 gap-y-1 ${className || ""}`}>
      {visibleItems.map((item) => (
        <Badge key={item.label} variant={item.variant || "gray"} onClick={item.onClick}>
          {item.label}
        </Badge>
      ))}
      {hasHiddenItems && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              color="minimal"
              className="h-auto p-0 border-0 hover:border-0"
              aria-label={`Show ${hiddenItems.length} more items`}
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
              {hiddenItems.map((item) => (
                <span
                  key={item.label}
                  className="text-default cursor-pointer text-sm hover:text-emphasis"
                  onClick={item.onClick}>
                  {item.label}
                </span>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export { LimitedBadges };
export type { BadgeItem };
