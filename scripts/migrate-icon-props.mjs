#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { glob } from "glob";

// Convert kebab-case to PascalCase with Icon suffix
function kebabToPascalIcon(str) {
  const pascal = str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
  return pascal + "Icon";
}

// Map of icon names to their lucide-react component names
const ICON_MAP = {
  "activity": "ActivityIcon",
  "arrow-down": "ArrowDownIcon",
  "arrow-left": "ArrowLeftIcon",
  "arrow-right": "ArrowRightIcon",
  "arrow-up": "ArrowUpIcon",
  "arrow-up-right": "ArrowUpRightIcon",
  "asterisk": "AsteriskIcon",
  "at-sign": "AtSignIcon",
  "atom": "AtomIcon",
  "badge-check": "BadgeCheckIcon",
  "ban": "BanIcon",
  "bell": "BellIcon",
  "binary": "BinaryIcon",
  "blocks": "BlocksIcon",
  "bold": "BoldIcon",
  "book": "BookIcon",
  "book-open": "BookOpenIcon",
  "book-open-check": "BookOpenCheckIcon",
  "book-user": "BookUserIcon",
  "bookmark": "BookmarkIcon",
  "building": "BuildingIcon",
  "calendar": "CalendarIcon",
  "calendar-check-2": "CalendarCheck2Icon",
  "calendar-days": "CalendarDaysIcon",
  "calendar-heart": "CalendarHeartIcon",
  "calendar-range": "CalendarRangeIcon",
  "calendar-search": "CalendarSearchIcon",
  "calendar-x-2": "CalendarX2Icon",
  "chart-bar": "ChartBarIcon",
  "chart-line": "ChartLineIcon",
  "check": "CheckIcon",
  "check-check": "CheckCheckIcon",
  "chevron-down": "ChevronDownIcon",
  "chevron-left": "ChevronLeftIcon",
  "chevron-right": "ChevronRightIcon",
  "chevron-up": "ChevronUpIcon",
  "chevrons-down-up": "ChevronsDownUpIcon",
  "chevrons-left": "ChevronsLeftIcon",
  "chevrons-right": "ChevronsRightIcon",
  "chevrons-up-down": "ChevronsUpDownIcon",
  "circle": "CircleIcon",
  "circle-alert": "CircleAlertIcon",
  "circle-arrow-up": "CircleArrowUpIcon",
  "circle-check": "CircleCheckIcon",
  "circle-check-big": "CircleCheckBigIcon",
  "circle-help": "CircleHelpIcon",
  "circle-plus": "CirclePlusIcon",
  "circle-x": "CircleXIcon",
  "clipboard": "ClipboardIcon",
  "clipboard-check": "ClipboardCheckIcon",
  "clock": "ClockIcon",
  "code": "CodeIcon",
  "columns-3": "Columns3Icon",
  "command": "CommandIcon",
  "contact": "ContactIcon",
  "copy": "CopyIcon",
  "corner-down-left": "CornerDownLeftIcon",
  "corner-down-right": "CornerDownRightIcon",
  "credit-card": "CreditCardIcon",
  "disc": "DiscIcon",
  "dot": "DotIcon",
  "download": "DownloadIcon",
  "ellipsis": "EllipsisIcon",
  "ellipsis-vertical": "EllipsisVerticalIcon",
  "external-link": "ExternalLinkIcon",
  "external": "ExternalLinkIcon",
  "eye": "EyeIcon",
  "eye-off": "EyeOffIcon",
  "file": "FileIcon",
  "file-down": "FileDownIcon",
  "file-text": "FileTextIcon",
  "filter": "FilterIcon",
  "fingerprint": "FingerprintIcon",
  "flag": "FlagIcon",
  "folder": "FolderIcon",
  "gift": "GiftIcon",
  "git-merge": "GitMergeIcon",
  "github": "GithubIcon",
  "globe": "GlobeIcon",
  "grid-3x3": "Grid3x3Icon",
  "handshake": "HandshakeIcon",
  "home": "HomeIcon",
  "info": "InfoIcon",
  "italic": "ItalicIcon",
  "key": "KeyIcon",
  "layers": "LayersIcon",
  "layout-dashboard": "LayoutDashboardIcon",
  "link": "LinkIcon",
  "link-2": "Link2Icon",
  "list-filter": "ListFilterIcon",
  "loader": "LoaderIcon",
  "lock": "LockIcon",
  "lock-open": "LockOpenIcon",
  "log-out": "LogOutIcon",
  "mail": "MailIcon",
  "mail-open": "MailOpenIcon",
  "map": "MapIcon",
  "map-pin": "MapPinIcon",
  "menu": "MenuIcon",
  "message-circle": "MessageCircleIcon",
  "messages-square": "MessagesSquareIcon",
  "mic": "MicIcon",
  "mic-off": "MicOffIcon",
  "monitor": "MonitorIcon",
  "moon": "MoonIcon",
  "paintbrush": "PaintbrushIcon",
  "paperclip": "PaperclipIcon",
  "pause": "PauseIcon",
  "pencil": "PencilIcon",
  "phone": "PhoneIcon",
  "phone-call": "PhoneCallIcon",
  "phone-incoming": "PhoneIncomingIcon",
  "phone-off": "PhoneOffIcon",
  "phone-outgoing": "PhoneOutgoingIcon",
  "play": "PlayIcon",
  "plus": "PlusIcon",
  "refresh-ccw": "RefreshCcwIcon",
  "refresh-cw": "RefreshCwIcon",
  "repeat": "RepeatIcon",
  "rocket": "RocketIcon",
  "rotate-ccw": "RotateCcwIcon",
  "rotate-cw": "RotateCwIcon",
  "search": "SearchIcon",
  "send": "SendIcon",
  "settings": "SettingsIcon",
  "share-2": "Share2Icon",
  "shield": "ShieldIcon",
  "shield-check": "ShieldCheckIcon",
  "shuffle": "ShuffleIcon",
  "sliders-horizontal": "SlidersHorizontalIcon",
  "sliders-vertical": "SlidersVerticalIcon",
  "smartphone": "SmartphoneIcon",
  "sparkles": "SparklesIcon",
  "split": "SplitIcon",
  "square-check": "SquareCheckIcon",
  "square-pen": "SquarePenIcon",
  "star": "StarIcon",
  "sun": "SunIcon",
  "sunrise": "SunriseIcon",
  "sunset": "SunsetIcon",
  "tags": "TagsIcon",
  "terminal": "TerminalIcon",
  "trash": "TrashIcon",
  "trash-2": "Trash2Icon",
  "trello": "TrelloIcon",
  "triangle-alert": "TriangleAlertIcon",
  "upload": "UploadIcon",
  "user": "UserIcon",
  "user-check": "UserCheckIcon",
  "user-plus": "UserPlusIcon",
  "user-x": "UserXIcon",
  "users": "UsersIcon",
  "venetian-mask": "VenetianMaskIcon",
  "video": "VideoIcon",
  "waypoints": "WaypointsIcon",
  "webhook": "WebhookIcon",
  "x": "XIcon",
  "zap": "ZapIcon",
};

async function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  const originalContent = content;
  
  // Find all StartIcon="..." and EndIcon="..." patterns
  const iconPropRegex = /(StartIcon|EndIcon)="([^"]+)"/g;
  const matches = [...content.matchAll(iconPropRegex)];
  
  if (matches.length === 0) {
    return { migrated: false, reason: "no matches" };
  }
  
  // Collect all icon names used in this file
  const iconNames = new Set();
  for (const match of matches) {
    const iconName = match[2];
    if (ICON_MAP[iconName]) {
      iconNames.add(iconName);
    } else {
      console.log(`  WARNING: Unknown icon "${iconName}" in ${filePath}`);
    }
  }
  
  if (iconNames.size === 0) {
    return { migrated: false, reason: "no known icons" };
  }
  
  // Replace StartIcon="icon-name" with StartIcon={IconNameIcon}
  for (const iconName of iconNames) {
    const componentName = ICON_MAP[iconName];
    // Replace StartIcon="icon-name" with StartIcon={ComponentName}
    content = content.replace(
      new RegExp(`StartIcon="${iconName}"`, "g"),
      `StartIcon={${componentName}}`
    );
    // Replace EndIcon="icon-name" with EndIcon={ComponentName}
    content = content.replace(
      new RegExp(`EndIcon="${iconName}"`, "g"),
      `EndIcon={${componentName}}`
    );
  }
  
  // Check if lucide-react import already exists
  const hasLucideImport = /from ["']lucide-react["']/.test(content);
  
  // Generate the import statement for the icons
  const iconImports = Array.from(iconNames).map(name => ICON_MAP[name]);
  
  if (hasLucideImport) {
    // Add to existing lucide-react import
    const lucideImportRegex = /import\s*\{([^}]+)\}\s*from\s*["']lucide-react["']/;
    const match = content.match(lucideImportRegex);
    if (match) {
      const existingImports = match[1].split(",").map(s => s.trim()).filter(Boolean);
      const newImports = [...new Set([...existingImports, ...iconImports])].sort();
      content = content.replace(
        lucideImportRegex,
        `import { ${newImports.join(", ")} } from "lucide-react"`
      );
    }
  } else {
    // Add new lucide-react import after the first import statement
    const firstImportMatch = content.match(/^import\s+.+$/m);
    if (firstImportMatch) {
      const importStatement = `import { ${iconImports.sort().join(", ")} } from "lucide-react";\n`;
      content = content.replace(
        firstImportMatch[0],
        firstImportMatch[0] + "\n" + importStatement
      );
    }
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    return { migrated: true, icons: Array.from(iconNames) };
  }
  
  return { migrated: false, reason: "no changes" };
}

async function main() {
  const files = await glob("**/*.tsx", {
    cwd: process.cwd(),
    ignore: ["node_modules/**", "**/node_modules/**", "scripts/**"],
  });
  
  let migratedCount = 0;
  let skippedCount = 0;
  
  for (const file of files) {
    const filePath = path.join(process.cwd(), file);
    const result = await migrateFile(filePath);
    
    if (result.migrated) {
      console.log(`MIGRATED: ${file} (icons: ${result.icons.join(", ")})`);
      migratedCount++;
    } else if (result.reason !== "no matches") {
      console.log(`SKIP: ${file} (${result.reason})`);
      skippedCount++;
    }
  }
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`Migrated: ${migratedCount} files`);
  console.log(`Skipped: ${skippedCount} files`);
}

main().catch(console.error);
