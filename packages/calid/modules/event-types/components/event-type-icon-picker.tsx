import type { IconName } from "@calid/features/ui";
import { Icon, Button } from "@calid/features/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@calid/features/ui";
import React, { useState, useMemo, useEffect } from "react";

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
    "git-commit-horizontal",
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
    "file-pen",
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
    "car-taxi-front",
    "map-pin",
    "map",
    "navigation",
    "compass",
    "route",
    "circle-parking",
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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[80vh] max-w-4xl flex-col">
        <DialogHeader>
          <DialogTitle>Choose Icon</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 flex-col space-y-4 overflow-hidden">
          {/* Debug info */}

          {/* Search bar */}
          <div className="relative">
            <Icon
              name="search"
              className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform"
            />
            <input
              type="text"
              placeholder="Search icons..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="border-border bg-background focus:ring-primary w-full rounded-lg border py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2"
            />
          </div>

          {/* Category tabs */}
          <div className="border-border flex flex-wrap gap-1 border-b pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategorySelect(category)}
                className={`rounded-md px-3 py-1 text-xs transition-colors ${
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                }`}>
                {category}
              </button>
            ))}
          </div>

          {/* Icon grid */}
          <div className="flex-1 overflow-y-auto">
            {filteredIcons.length === 0 ? (
              <div className="text-muted-foreground flex h-32 items-center justify-center">
                <div className="text-center">
                  <Icon name="search" className="mx-auto mb-2 h-8 w-8" />
                  <p>No icons found</p>
                  {searchQuery && <p className="text-xs">Try a different search term</p>}
                </div>
              </div>
            ) : (
              <div className="lg:grid-cols-14 grid grid-cols-8 gap-2 p-1 sm:grid-cols-10 md:grid-cols-12">
                {filteredIcons.map((iconName) => {
                  const isSelected = selectedIcon === iconName;

                  return (
                    <button
                      key={iconName}
                      onClick={() => handleIconSelect(iconName)}
                      className={`hover:bg-muted group relative flex h-12 w-12 items-center justify-center rounded-lg border-2 transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "hover:border-muted-foreground/20 border-transparent"
                      }`}
                      title={iconName}>
                      <Icon
                        name={iconName as IconName}
                        className="h-5 w-5"
                        style={{ color: isSelected ? selectedColor : undefined }}
                      />
                      {isSelected && (
                        <div className="bg-primary absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full">
                          <Icon name="check" className="text-primary-foreground h-2.5 w-2.5" />
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

              {/* Predefined color palette */}
              <div className="flex flex-wrap gap-2">
                {colorPalette.map((color) => {
                  const isSelected = selectedColor === color;

                  return (
                    <button
                      key={color}
                      onClick={() => handleColorChange(color)}
                      className={`h-8 w-8 rounded-full border-2 transition-all ${
                        isSelected ? "border-foreground scale-110" : "border-border hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  );
                })}
              </div>

              {/* Custom color input */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Custom:</label>
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="border-border h-8 w-16 cursor-pointer rounded border"
                />
                <input
                  type="text"
                  value={selectedColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  placeholder="#6366f1"
                  className="border-border bg-background focus:ring-primary flex-1 rounded border px-3 py-1 text-sm focus:outline-none focus:ring-2"
                />
              </div>

              {/* Preview */}
              {selectedIcon && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Preview:</span>
                  <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                    <Icon
                      name={selectedIcon as IconName}
                      className="h-5 w-5"
                      style={{ color: selectedColor }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button color="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!selectedIcon}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
