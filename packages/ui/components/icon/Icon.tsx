import type { LucideProps } from "lucide-react";
import * as lucideIcons from "lucide-react";

import cn from "@calcom/ui/classNames";

// All available icon names (kebab-case)
export type IconName =
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
  | "book"
  | "bookmark"
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
  | "circle-plus"
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
  | "list-filter"
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
  | "mic-off"
  | "mic"
  | "monitor"
  | "moon"
  | "paintbrush"
  | "paperclip"
  | "pause"
  | "pencil"
  | "phone-call"
  | "phone-incoming"
  | "phone-off"
  | "phone-outgoing"
  | "phone"
  | "play"
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
  | "split"
  | "square-check"
  | "square-pen"
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

// Convert kebab-case to PascalCase for lucide-react component names
function kebabToPascal(str: string): string {
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

// Get the lucide-react component for a given icon name
function getLucideIcon(name: IconName): React.ComponentType<LucideProps> | null {
  const pascalName = kebabToPascal(name);
  const icon = (lucideIcons as Record<string, React.ComponentType<LucideProps>>)[pascalName];
  return icon || null;
}

export interface IconProps extends Omit<LucideProps, "ref"> {
  name: IconName;
  size?: number | string;
}

function Icon({ name, size = 16, className, ...props }: IconProps) {
  const LucideIcon = getLucideIcon(name);

  if (!LucideIcon) {
    console.warn(`Icon "${name}" not found in lucide-react`);
    return null;
  }

  return <LucideIcon size={size} className={cn("fill-transparent", className)} aria-hidden {...props} />;
}

export { Icon };
export default Icon;
