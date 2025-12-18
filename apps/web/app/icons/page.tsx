import { _generateMetadataForStaticPage } from "app/_utils";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";

import type { IconName } from "@calcom/ui/components/icon";

import { IconGrid } from "./IconGrid";

// List of available icons
const iconList = [
  "activity", "arrow-down", "arrow-left", "arrow-right", "arrow-up-right", "arrow-up",
  "asterisk", "at-sign", "atom", "badge-check", "ban", "bell", "binary", "blocks", "bold",
  "book-open-check", "book-open", "book-user", "book", "bookmark", "building",
  "calendar-check-2", "calendar-days", "calendar-heart", "calendar-range", "calendar-search",
  "calendar-x-2", "calendar", "chart-bar", "chart-line", "check-check", "check",
  "chevron-down", "chevron-left", "chevron-right", "chevron-up", "chevrons-down-up",
  "chevrons-left", "chevrons-right", "chevrons-up-down", "circle-alert", "circle-arrow-up",
  "circle-check-big", "circle-check", "circle-help", "circle-plus", "circle-x", "circle",
  "clipboard-check", "clipboard", "clock", "code", "columns-3", "command", "contact", "copy",
  "corner-down-left", "corner-down-right", "credit-card", "disc", "dot", "download",
  "ellipsis-vertical", "ellipsis", "external-link", "eye-off", "eye", "file-down", "file-text",
  "file", "filter", "fingerprint", "flag", "folder", "gift", "git-merge", "github", "globe",
  "grid-3x3", "handshake", "info", "italic", "key", "layers", "layout-dashboard", "link-2",
  "link", "list-filter", "loader", "lock-open", "lock", "log-out", "mail-open", "mail",
  "map-pin", "map", "menu", "message-circle", "messages-square", "mic-off", "mic", "monitor",
  "moon", "paintbrush", "paperclip", "pause", "pencil", "phone-call", "phone-incoming",
  "phone-off", "phone-outgoing", "phone", "play", "plus", "refresh-ccw", "refresh-cw",
  "repeat", "rocket", "rotate-ccw", "rotate-cw", "search", "send", "settings", "share-2",
  "shield-check", "shield", "shuffle", "sliders-horizontal", "sliders-vertical", "smartphone",
  "sparkles", "split", "square-check", "square-pen", "star", "sun", "sunrise", "sunset",
  "tags", "terminal", "trash-2", "trash", "trello", "triangle-alert", "upload", "user-check",
  "user-plus", "user-x", "user", "users", "venetian-mask", "video", "waypoints", "webhook",
  "x", "zap"
] as const;

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  return await _generateMetadataForStaticPage("Icons Showcase", "", undefined, undefined, "/icons");
}

const interFont = Inter({ subsets: ["latin"], variable: "--font-sans", preload: true, display: "swap" });
const calFont = localFont({
  src: "../../fonts/CalSans-SemiBold.woff2",
  variable: "--font-cal",
  preload: true,
  display: "swap",
  weight: "600",
});

export default function IconsPage() {
  const icons = [...iconList].sort() as IconName[];

  return (
    <div className={`${interFont.variable} ${calFont.variable}`}>
      <div className="bg-subtle flex h-screen">
        <div className="bg-default m-auto min-w-full rounded-md p-10 text-right ltr:text-left">
          <h1 className="text-emphasis font-cal text-2xl font-medium">Icons Showcase</h1>
          <IconGrid title="Regular Icons" icons={icons} />
          <IconGrid
            title="Filled Icons"
            icons={icons}
            rootClassName="bg-inverted text-inverted"
            iconClassName="fill-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
