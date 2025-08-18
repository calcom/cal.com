"use client";

import React, { useState, useMemo } from "react";
import { Toaster } from "react-hot-toast";

import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

type IconName =
  | "activity"
  | "arrow-down"
  | "arrow-left"
  | "arrow-right"
  | "arrow-up-right"
  | "arrow-up"
  | "asterisk"
  | "at-sign"
  | "atom"
  | "badge-check"
  | "ban"
  | "bell"
  | "binary"
  | "blocks"
  | "bold"
  | "book-open-check"
  | "book-open"
  | "book-user"
  | "building"
  | "calendar-check-2"
  | "calendar-days"
  | "calendar-heart"
  | "calendar-range"
  | "calendar-search"
  | "calendar-x-2"
  | "calendar"
  | "chart-bar"
  | "chart-line"
  | "check-check"
  | "check"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "chevron-up"
  | "chevrons-down-up"
  | "chevrons-left"
  | "chevrons-right"
  | "chevrons-up-down"
  | "circle-alert"
  | "circle-arrow-up"
  | "circle-check-big"
  | "circle-check"
  | "circle-help"
  | "circle-x"
  | "circle"
  | "clipboard-check"
  | "clipboard"
  | "clock"
  | "code"
  | "columns-3"
  | "command"
  | "contact"
  | "copy"
  | "corner-down-left"
  | "corner-down-right"
  | "credit-card"
  | "disc"
  | "dot"
  | "download"
  | "ellipsis-vertical"
  | "ellipsis"
  | "external-link"
  | "eye-off"
  | "eye"
  | "file-down"
  | "file-text"
  | "file"
  | "filter"
  | "fingerprint"
  | "flag"
  | "folder"
  | "gift"
  | "git-merge"
  | "github"
  | "globe"
  | "grid-3x3"
  | "handshake"
  | "info"
  | "italic"
  | "key"
  | "layers"
  | "layout-dashboard"
  | "link-2"
  | "link"
  | "loader"
  | "lock-open"
  | "lock"
  | "log-out"
  | "mail-open"
  | "mail"
  | "map-pin"
  | "map"
  | "menu"
  | "message-circle"
  | "messages-square"
  | "moon"
  | "paintbrush"
  | "paperclip"
  | "pencil"
  | "phone-call"
  | "phone"
  | "plus"
  | "refresh-ccw"
  | "refresh-cw"
  | "repeat"
  | "rocket"
  | "rotate-ccw"
  | "rotate-cw"
  | "search"
  | "send"
  | "settings"
  | "share-2"
  | "shield-check"
  | "shield"
  | "shuffle"
  | "sliders-horizontal"
  | "sliders-vertical"
  | "smartphone"
  | "sparkles"
  | "square-check"
  | "star"
  | "sun"
  | "sunrise"
  | "sunset"
  | "tags"
  | "terminal"
  | "trash-2"
  | "trash"
  | "trello"
  | "triangle-alert"
  | "upload"
  | "user-check"
  | "user-plus"
  | "user-x"
  | "user"
  | "users"
  | "venetian-mask"
  | "video"
  | "waypoints"
  | "webhook"
  | "x"
  | "zap";

interface IconGridProps {
  className?: string;
}

interface CopyMenuProps {
  name: IconName;
  onCopy: (format: string) => void;
}

const CopyMenu: React.FC<CopyMenuProps> = ({ name, onCopy }) => {
  return (
    <div className="absolute inset-2 flex items-center justify-center bg-black/10 opacity-0 transition-opacity group-hover:opacity-100">
      <div className="bg-default space-y-1 rounded-md p-2 shadow-lg">
        <button
          onClick={() => onCopy(`<Icon name="${name}" className="h-4 w-4" />`)}
          className="hover:bg-subtle w-full rounded px-3 py-1 text-left text-sm">
          Copy Component
        </button>
      </div>
    </div>
  );
};

export const IconGrid: React.FC<IconGridProps> = ({ className }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(`Copied ${value}`, "success");
    } catch (error) {
      console.error("Failed to copy:", error);
      showToast("Failed to copy", "error");
    }
  };

  const icons: IconName[] = [
    "activity",
    "arrow-down",
    "arrow-left",
    "arrow-right",
    "arrow-up-right",
    "arrow-up",
    "asterisk",
    "at-sign",
    "atom",
    "badge-check",
    "ban",
    "bell",
    "binary",
    "blocks",
    "bold",
    "book-open-check",
    "book-open",
    "book-user",
    "building",
    "calendar-check-2",
    "calendar-days",
    "calendar-heart",
    "calendar-range",
    "calendar-search",
    "calendar-x-2",
    "calendar",
    "chart-bar",
    "chart-line",
    "check-check",
    "check",
    "chevron-down",
    "chevron-left",
    "chevron-right",
    "chevron-up",
    "chevrons-down-up",
    "chevrons-left",
    "chevrons-right",
    "chevrons-up-down",
    "circle-alert",
    "circle-arrow-up",
    "circle-check-big",
    "circle-check",
    "circle-help",
    "circle-x",
    "circle",
    "clipboard-check",
    "clipboard",
    "clock",
    "code",
    "columns-3",
    "command",
    "contact",
    "copy",
    "corner-down-left",
    "corner-down-right",
    "credit-card",
    "disc",
    "dot",
    "download",
    "ellipsis-vertical",
    "ellipsis",
    "external-link",
    "eye-off",
    "eye",
    "file-down",
    "file-text",
    "file",
    "filter",
    "fingerprint",
    "flag",
    "folder",
    "gift",
    "git-merge",
    "github",
    "globe",
    "grid-3x3",
    "handshake",
    "info",
    "italic",
    "key",
    "layers",
    "layout-dashboard",
    "link-2",
    "link",
    "loader",
    "lock-open",
    "lock",
    "log-out",
    "mail-open",
    "mail",
    "map-pin",
    "map",
    "menu",
    "message-circle",
    "messages-square",
    "moon",
    "paintbrush",
    "paperclip",
    "pencil",
    "phone-call",
    "phone",
    "plus",
    "refresh-ccw",
    "refresh-cw",
    "repeat",
    "rocket",
    "rotate-ccw",
    "rotate-cw",
    "search",
    "send",
    "settings",
    "share-2",
    "shield-check",
    "shield",
    "shuffle",
    "sliders-horizontal",
    "sliders-vertical",
    "smartphone",
    "sparkles",
    "square-check",
    "star",
    "sun",
    "sunrise",
    "sunset",
    "tags",
    "terminal",
    "trash-2",
    "trash",
    "trello",
    "triangle-alert",
    "upload",
    "user-check",
    "user-plus",
    "user-x",
    "user",
    "users",
    "venetian-mask",
    "video",
    "waypoints",
    "webhook",
    "x",
    "zap",
  ];

  const filteredIcons = useMemo(() => {
    if (!searchQuery) return icons;
    const query = searchQuery.toLowerCase();
    return icons.filter((icon) => icon.toLowerCase().includes(query));
  }, [searchQuery]);

  return (
    <>
      <Toaster position="bottom-right" />
      <div className={className}>
        <div className="mb-8">
          <input
            type="text"
            placeholder="Search icons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-subtle bg-default text-emphasis focus:ring-emphasis placeholder:text-subtle w-full rounded-md border px-4 py-2 focus:outline-none focus:ring-2"
          />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {filteredIcons.map((iconName) => (
            <div
              key={iconName}
              className="border-subtle bg-default group relative overflow-hidden rounded-lg border p-4">
              <div className="flex flex-col items-center space-y-2">
                <div className="bg-subtle flex h-12 w-12 items-center justify-center rounded-md">
                  <Icon name={iconName} className="text-emphasis h-6 w-6" />
                </div>
                <p className="text-emphasis text-center text-sm">{iconName}</p>
              </div>
              <CopyMenu name={iconName} onCopy={handleCopy} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
