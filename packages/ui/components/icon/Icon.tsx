import type { LucideIcon, LucideProps } from "lucide-react";
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Asterisk,
  AtSign,
  Atom,
  BadgeCheck,
  Ban,
  Bell,
  Binary,
  Blocks,
  Bold,
  Book,
  BookOpen,
  BookOpenCheck,
  BookUser,
  Bookmark,
  Building,
  Calendar,
  CalendarCheck2,
  CalendarDays,
  CalendarHeart,
  CalendarRange,
  CalendarSearch,
  CalendarX2,
  ChartBar,
  ChartLine,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsDownUp,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Circle,
  CircleAlert,
  CircleArrowUp,
  CircleCheck,
  CircleCheckBig,
  CircleHelp,
  CirclePlus,
  CircleX,
  Clipboard,
  ClipboardCheck,
  Clock,
  Code,
  Columns3,
  Command,
  Contact,
  Copy,
  CornerDownLeft,
  CornerDownRight,
  CreditCard,
  Disc,
  Dot,
  Download,
  Ellipsis,
  EllipsisVertical,
  ExternalLink,
  Eye,
  EyeOff,
  File,
  FileDown,
  FileText,
  Filter,
  Fingerprint,
  Flag,
  Folder,
  Gift,
  GitMerge,
  Github,
  Globe,
  Grid3x3,
  Handshake,
  Info,
  Italic,
  Key,
  Layers,
  LayoutDashboard,
  Link,
  Link2,
  ListFilter,
  Loader,
  Lock,
  LockOpen,
  LogOut,
  Mail,
  MailOpen,
  Map,
  MapPin,
  Menu,
  MessageCircle,
  MessagesSquare,
  Mic,
  MicOff,
  Monitor,
  Moon,
  Paintbrush,
  Paperclip,
  Pause,
  Pencil,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOff,
  PhoneOutgoing,
  Play,
  Plus,
  RefreshCcw,
  RefreshCw,
  Repeat,
  Rocket,
  RotateCcw,
  RotateCw,
  Search,
  Send,
  Settings,
  Share2,
  Shield,
  ShieldCheck,
  Shuffle,
  SlidersHorizontal,
  SlidersVertical,
  Smartphone,
  Sparkles,
  Split,
  SquareCheck,
  SquarePen,
  Star,
  Sun,
  Sunrise,
  Sunset,
  Tags,
  Terminal,
  Trash,
  Trash2,
  Trello,
  TriangleAlert,
  Upload,
  User,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  VenetianMask,
  Video,
  Waypoints,
  Webhook,
  X,
  Zap,
} from "lucide-react";

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

// Static map of icon names to components for tree shaking
const ICON_MAP: Record<IconName, LucideIcon> = {
  activity: Activity,
  "arrow-down": ArrowDown,
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  "arrow-up": ArrowUp,
  "arrow-up-right": ArrowUpRight,
  asterisk: Asterisk,
  "at-sign": AtSign,
  atom: Atom,
  "badge-check": BadgeCheck,
  ban: Ban,
  bell: Bell,
  binary: Binary,
  blocks: Blocks,
  bold: Bold,
  book: Book,
  "book-open": BookOpen,
  "book-open-check": BookOpenCheck,
  "book-user": BookUser,
  bookmark: Bookmark,
  building: Building,
  calendar: Calendar,
  "calendar-check-2": CalendarCheck2,
  "calendar-days": CalendarDays,
  "calendar-heart": CalendarHeart,
  "calendar-range": CalendarRange,
  "calendar-search": CalendarSearch,
  "calendar-x-2": CalendarX2,
  "chart-bar": ChartBar,
  "chart-line": ChartLine,
  check: Check,
  "check-check": CheckCheck,
  "chevron-down": ChevronDown,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  "chevron-up": ChevronUp,
  "chevrons-down-up": ChevronsDownUp,
  "chevrons-left": ChevronsLeft,
  "chevrons-right": ChevronsRight,
  "chevrons-up-down": ChevronsUpDown,
  circle: Circle,
  "circle-alert": CircleAlert,
  "circle-arrow-up": CircleArrowUp,
  "circle-check": CircleCheck,
  "circle-check-big": CircleCheckBig,
  "circle-help": CircleHelp,
  "circle-plus": CirclePlus,
  "circle-x": CircleX,
  clipboard: Clipboard,
  "clipboard-check": ClipboardCheck,
  clock: Clock,
  code: Code,
  "columns-3": Columns3,
  command: Command,
  contact: Contact,
  copy: Copy,
  "corner-down-left": CornerDownLeft,
  "corner-down-right": CornerDownRight,
  "credit-card": CreditCard,
  disc: Disc,
  dot: Dot,
  download: Download,
  ellipsis: Ellipsis,
  "ellipsis-vertical": EllipsisVertical,
  "external-link": ExternalLink,
  eye: Eye,
  "eye-off": EyeOff,
  file: File,
  "file-down": FileDown,
  "file-text": FileText,
  filter: Filter,
  fingerprint: Fingerprint,
  flag: Flag,
  folder: Folder,
  gift: Gift,
  "git-merge": GitMerge,
  github: Github,
  globe: Globe,
  "grid-3x3": Grid3x3,
  handshake: Handshake,
  info: Info,
  italic: Italic,
  key: Key,
  layers: Layers,
  "layout-dashboard": LayoutDashboard,
  link: Link,
  "link-2": Link2,
  "list-filter": ListFilter,
  loader: Loader,
  lock: Lock,
  "lock-open": LockOpen,
  "log-out": LogOut,
  mail: Mail,
  "mail-open": MailOpen,
  map: Map,
  "map-pin": MapPin,
  menu: Menu,
  "message-circle": MessageCircle,
  "messages-square": MessagesSquare,
  mic: Mic,
  "mic-off": MicOff,
  monitor: Monitor,
  moon: Moon,
  paintbrush: Paintbrush,
  paperclip: Paperclip,
  pause: Pause,
  pencil: Pencil,
  phone: Phone,
  "phone-call": PhoneCall,
  "phone-incoming": PhoneIncoming,
  "phone-off": PhoneOff,
  "phone-outgoing": PhoneOutgoing,
  play: Play,
  plus: Plus,
  "refresh-ccw": RefreshCcw,
  "refresh-cw": RefreshCw,
  repeat: Repeat,
  rocket: Rocket,
  "rotate-ccw": RotateCcw,
  "rotate-cw": RotateCw,
  search: Search,
  send: Send,
  settings: Settings,
  "share-2": Share2,
  shield: Shield,
  "shield-check": ShieldCheck,
  shuffle: Shuffle,
  "sliders-horizontal": SlidersHorizontal,
  "sliders-vertical": SlidersVertical,
  smartphone: Smartphone,
  sparkles: Sparkles,
  split: Split,
  "square-check": SquareCheck,
  "square-pen": SquarePen,
  star: Star,
  sun: Sun,
  sunrise: Sunrise,
  sunset: Sunset,
  tags: Tags,
  terminal: Terminal,
  trash: Trash,
  "trash-2": Trash2,
  trello: Trello,
  "triangle-alert": TriangleAlert,
  upload: Upload,
  user: User,
  "user-check": UserCheck,
  "user-plus": UserPlus,
  "user-x": UserX,
  users: Users,
  "venetian-mask": VenetianMask,
  video: Video,
  waypoints: Waypoints,
  webhook: Webhook,
  x: X,
  zap: Zap,
};

export interface IconProps extends Omit<LucideProps, "ref"> {
  name: IconName;
  size?: number | string;
}

function Icon({ name, size = 16, className, ...props }: IconProps) {
  const LucideIcon = ICON_MAP[name];

  if (!LucideIcon) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  return <LucideIcon size={size} className={cn("fill-transparent", className)} aria-hidden {...props} />;
}

export { Icon };
export default Icon;
