import { Button } from "@calid/features/ui/components/button";
import { Input, TextField } from "@calid/features/ui/components/input/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@calid/features/ui/components/dialog";
import { Icon, type IconName } from "@calid/features/ui/components/icon";
import React, { useState, useMemo, useEffect } from "react";
import { cn } from "@calid/features/lib/cn";
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

  // Get all available icons
  const allIcons = useMemo(() => {
    const iconList: string[] = [];
    Object.values(iconCategories).forEach((categoryIcons) => {
      iconList.push(...categoryIcons);
    });
    return [...new Set(iconList)]; // Remove duplicates
  }, []);

  // Filter icons based on search and category
  const filteredIcons = useMemo(() => {
    let icons: string[] = [];

    // First filter by category
    if (selectedCategory === "All") {
      icons = allIcons;
    } else {
      const categoryKey = selectedCategory as keyof typeof iconCategories;
      icons = iconCategories[categoryKey] ? [...iconCategories[categoryKey]] : [];
    }

    // Then filter by search query
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
    setSelectedCategory(category);
  };

  const handleApply = () => {
    onSelectIcon({
      icon: selectedIcon,
      color: selectedColor,
    });
    onClose();
  };

  const handleClose = () => {
    // Reset to current values when closing without applying
    setSelectedIcon(currentIconParams.icon);
    setSelectedColor(currentIconParams.color);
    onClose();
  };

  // Reset when opening/currentIconParams changes
  useEffect(() => {
    if (isOpen) {
      setSelectedIcon(currentIconParams.icon);
      setSelectedColor(currentIconParams.color);
      setSearchQuery("");
      setSelectedCategory("All");
    }
  }, [isOpen, currentIconParams]);

  const categories = ["All", ...Object.keys(iconCategories)];

  // Predefined color palette
  const colorPalette = [
    "#6366f1", // Indigo
    "#8b5cf6", // Purple
    "#06b6d4", // Cyan
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#ef4444", // Red
    "#ec4899", // Pink
    "#84cc16", // Lime
    "#f97316", // Orange
    "#6b7280", // Gray
    "#1f2937", // Dark gray
    "#000000", // Black
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="flex max-h-[80vh] max-w-4xl flex-col">
        <DialogHeader>
          <DialogTitle>Choose Icon</DialogTitle>
          <TextField
            addOnLeading={<Icon name="search" className="text-subtle h-4 w-4" />}
            addOnClassname="!border-muted"
            containerClassName={cn("focus:!ring-offset-0 py-2")}
            placeholder="Search icons..."
            type="search"
            autoComplete="false"
            value={searchQuery}
            onChange={handleSearchChange}>
          </TextField>
        </DialogHeader>

        <div className="flex flex-1 flex-col space-y-4 overflow-hidden">
          {/* Category tabs */}
          <div className="border-border flex flex-wrap gap-1 border-b pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategorySelect(category)}
                className={`rounded-md px-3 py-1 text-xs transition-colors ${
                  selectedCategory === category
                    ? "bg-cal-active text-white"
                    : "bg-muted text-default hover:text-emphasis"
                }`}>
                {category}
              </button>
            ))}
          </div>

          {/* Icon grid */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {filteredIcons.length === 0 ? (
              <div className="text-muted-foreground flex h-32 items-center justify-center">
                <div className="text-center">
                  <Icon name="search" className="mx-auto mb-2 h-8 w-8" />
                  <p>No icons found</p>
                  {searchQuery && <p className="text-xs">Try a different search term</p>}
                </div>
              </div>
            ) : (
              <div className="lg:grid-cols-14 grid grid-cols-8 gap-2 py-2 sm:grid-cols-10 md:grid-cols-12">
                {filteredIcons.map((iconName) => {
                  const isSelected = selectedIcon === iconName;

                  return (
                    <button
                      key={iconName}
                      onClick={() => handleIconSelect(iconName)}
                      className={`hover:bg-subtle group relative flex h-12 w-12 items-center justify-center rounded-lg border-2 transition-all ${
                        isSelected
                          ? "border-active"
                          : "border-transparent"
                      }`}
                      title={iconName}>
                      <Icon
                        name={iconName as IconName}
                        className="h-5 w-5"
                        style={{ color: isSelected ? selectedColor : undefined }}
                      />
                      {isSelected && (
                        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 rounded-full bg-cal-active p-0.5">
                          <Icon name="check" className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Color picker */}
          <div className="border-border border-t pt-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Icon Color</h4>
              {/* Custom color input */}
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
          <Button onClick={handleApply} disabled={!selectedIcon}>
            {t("apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
