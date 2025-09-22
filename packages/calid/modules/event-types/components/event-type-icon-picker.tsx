import { cn } from "@calid/features/lib/cn";
import { Button } from "@calid/features/ui/components/button";
import { BlankCard } from "@calid/features/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@calid/features/ui/components/dialog";
import { Icon, type IconName } from "@calid/features/ui/components/icon";
import { Input, TextField } from "@calid/features/ui/components/input/input";
import React, { useState, useMemo, useEffect } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import type { IconParams } from "./event-type-card-icon";

// Icon categories for organization
const iconCategories = {
  Business: [
    "briefcase",
    "calendar",
    "clock",
    "users",
    "user",
    "target",
    "trending-up",
    "chart-bar",
    "chart-pie",
    "building",
    "building-2",
    "handshake",
    "dollar-sign",
    "credit-card",
    "wallet",
    "file-text",
    "folder",
    "archive",
    "bookmark",
  ],
  Communication: [
    "message-circle",
    "message-square",
    "mail",
    "phone",
    "phone-call",
    "video",
    "mic",
    "mic-off",
    "speaker",
    "headphones",
    "bell",
    "bell-ring",
    "share",
    "send",
    "reply",
    "forward",
    "at-sign",
    "hash",
    "megaphone",
    "radio",
  ],
  Technology: [
    "monitor",
    "smartphone",
    "laptop",
    "tablet",
    "hard-drive",
    "server",
    "database",
    "wifi",
    "bluetooth",
    "code",
    "terminal",
    "git-branch",
    "git-merge",
    "github",
    "globe",
    "cloud",
    "cloud-upload",
    "cloud-download",
    "cpu",
  ],
  Education: [
    "graduation-cap",
    "book-open",
    "book",
    "pen-tool",
    "pen",
    "file-text",
    "school",
    "award",
    "medal",
    "trophy",
    "star",
    "brain",
    "lightbulb",
    "microscope",
    "calculator",
    "ruler",
    "compass",
    "globe",
    "library",
    "presentation",
  ],
  Health: [
    "heart",
    "activity",
    "stethoscope",
    "pill",
    "cross",
    "shield",
    "shield-check",
    "thermometer",
    "zap",
    "battery",
    "leaf",
    "sun",
    "moon",
    "eye",
    "eye-off",
    "smile",
    "frown",
    "meh",
    "thumbs-up",
    "thumbs-down",
  ],
  Food: [
    "coffee",
    "cup-soda",
    "wine",
    "beer",
    "ice-cream-cone",
    "pizza",
    "apple",
    "cherry",
    "banana",
    "grape",
    "salad",
    "utensils",
    "utensils-crossed",
    "chef-hat",
    "cookie",
    "cake",
    "candy",
    "fish",
    "beef",
    "egg",
  ],
  Transportation: [
    "car",
    "bus",
    "train-front",
    "plane",
    "ship",
    "bike",
    "truck",
    "car",
    "map-pin",
    "map",
    "navigation",
    "compass",
    "route",
    "circle",
    "fuel",
    "car-front",
    "sailboat",
    "rocket",
  ],
  Tools: [
    "settings",
    "wrench",
    "hammer",
    "scissors",
    "paperclip",
    "pin",
    "lock",
    "lock-open",
    "key",
    "search",
    "filter",
    "download",
    "upload",
    "refresh-cw",
    "rotate-ccw",
    "rotate-cw",
    "shuffle",
    "repeat",
  ],
} as const;

interface EventTypeIconPickerProps {
  isOpen: boolean;
  onClose: () => void;
  currentIconParams?: IconParams;
  onSelectIcon: (iconParams: IconParams) => void;
}

export const EventTypeIconPicker: React.FC<EventTypeIconPickerProps> = ({
  isOpen,
  onClose,
  currentIconParams = { icon: "calendar", color: "#6B7280" },
  onSelectIcon,
}) => {
  const { t } = useLocale();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedColor, setSelectedColor] = useState(currentIconParams.color);
  const [selectedIcon, setSelectedIcon] = useState(currentIconParams.icon);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [isTransitioning, setIsTransitioning] = useState(false);

  const allIcons = useMemo(() => {
    const iconList: string[] = [];
    Object.values(iconCategories).forEach((categoryIcons) => {
      iconList.push(...categoryIcons);
    });
    return [...new Set(iconList)];
  }, []);

  const filteredIcons = useMemo(() => {
    let icons: string[] = [];

    if (selectedCategory === "All") {
      icons = allIcons;
    } else {
      const categoryKey = selectedCategory as keyof typeof iconCategories;
      icons = iconCategories[categoryKey] ? [...iconCategories[categoryKey]] : [];
    }

    if (searchQuery.trim()) {
      icons = icons.filter((iconName) => iconName.toLowerCase().includes(searchQuery.toLowerCase().trim()));
    }

    return icons;
  }, [searchQuery, selectedCategory, allIcons]);

  const handleIconSelect = (iconName: string) => {
    setSelectedIcon(iconName as IconName);
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleCategorySelect = (category: string) => {
    if (category === selectedCategory) return;

    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedCategory(category);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 150);
    }, 150);
  };

  const handleApply = () => {
    onSelectIcon({
      icon: selectedIcon,
      color: selectedColor,
    });
    onClose();
  };

  const handleClose = () => {
    setSelectedIcon(currentIconParams.icon);
    setSelectedColor(currentIconParams.color);
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedIcon(currentIconParams.icon);
      setSelectedColor(currentIconParams.color);
      setSearchQuery("");
      setSelectedCategory("All");
    }
  }, [isOpen, currentIconParams]);

  const categories = ["All", ...Object.keys(iconCategories)];

  // Check if any changes have been made from the original values
  const hasChanges = useMemo(() => {
    return selectedIcon !== currentIconParams.icon || selectedColor !== currentIconParams.color;
  }, [selectedIcon, selectedColor, currentIconParams.icon, currentIconParams.color]);

  return (
    <>
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="bg-muted flex max-h-[80vh] max-w-4xl flex-col">
          <DialogHeader>
            <DialogTitle className="text-default">{t("choose_icon")}</DialogTitle>
            <TextField
              addOnLeading={<Icon name="search" className="text-subtle h-4 w-4" />}
              addOnClassname="!border-muted"
              containerClassName={cn("focus:!ring-offset-0 py-2")}
              placeholder="Search icons..."
              type="search"
              autoComplete="false"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </DialogHeader>

          <div className="flex flex-1 flex-col space-y-4 overflow-hidden">
            <div className="border-border flex flex-wrap gap-1 border-b pb-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategorySelect(category)}
                  disabled={isTransitioning}
                  className={`relative transform rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 ease-in-out ${
                    selectedCategory === category
                      ? "bg-cal-active scale-105 text-white shadow-sm"
                      : "bg-muted text-default hover:text-emphasis hover:bg-muted/80 hover:scale-102"
                  } ${isTransitioning ? "opacity-70" : ""}`}>
                  {category}
                  {selectedCategory === category && (
                    <div className="bg-cal-active/20 absolute inset-0 animate-pulse rounded-md" />
                  )}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div
                className={`transition-all duration-300 ease-in-out ${
                  isTransitioning
                    ? "translate-y-2 transform opacity-0"
                    : "translate-y-0 transform opacity-100"
                }`}>
                {filteredIcons.length === 0 ? (
                  <BlankCard
                    Icon="search"
                    headline={t("no_icons_found")}
                    description={t("try_different_search_term")}
                  />
                ) : (
                  <div className="lg:grid-cols-14 grid grid-cols-8 gap-2 py-2 sm:grid-cols-10 md:grid-cols-12">
                    {filteredIcons.map((iconName, index) => {
                      const isSelected = selectedIcon === iconName;

                      return (
                        <button
                          key={iconName}
                          onClick={() => handleIconSelect(iconName)}
                          className={`hover:bg-subtle group relative flex h-12 w-12 items-center justify-center rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                            isSelected ? "border-active shadow-sm" : "hover:border-muted border-transparent"
                          }`}
                          style={{
                            animationDelay: `${index * 20}ms`,
                            animation: isTransitioning ? "none" : "fadeInUp 0.3s ease-out forwards",
                          }}
                          title={iconName}>
                          <Icon
                            name={iconName as IconName}
                            className="h-5 w-5 transition-colors duration-200"
                            style={{ color: isSelected ? selectedColor : undefined }}
                          />
                          {isSelected && (
                            <div className="bg-cal-active absolute right-0 top-0 -translate-y-1/2 translate-x-1/2 rounded-full p-0.5">
                              <Icon name="check" className="h-2.5 w-2.5 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="border-border border-t pt-4">
              <div className="space-y-3">
                <h4 className="text-sm font-medium">{t("icon_color")}</h4>
                <div className="flex items-center space-x-2">
                  <Input
                    type="color"
                    className="h-8 w-8 p-0"
                    value={selectedColor}
                    onChange={(e) => handleColorChange(e.target.value)}
                  />
                  <Input
                    type="text"
                    value={selectedColor}
                    onChange={(e) => handleColorChange(e.target.value)}
                    placeholder="#6366f1"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button color="secondary" onClick={handleClose}>
              {t("cancel")}
            </Button>
            <Button onClick={handleApply} disabled={!selectedIcon || !hasChanges}>
              {t("apply")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
