import type { LucideIcon } from "lucide-react";
import {
  ActivityIcon as LucideActivityIcon,
  ArrowDownIcon as LucideArrowDownIcon,
  ArrowLeftIcon as LucideArrowLeftIcon,
  ArrowRightIcon as LucideArrowRightIcon,
  ArrowUpRightIcon as LucideArrowUpRightIcon,
  ArrowUpIcon as LucideArrowUpIcon,
  AsteriskIcon as LucideAsteriskIcon,
  AtSignIcon as LucideAtSignIcon,
  AtomIcon as LucideAtomIcon,
  BadgeCheckIcon as LucideBadgeCheckIcon,
  BanIcon as LucideBanIcon,
  BellIcon as LucideBellIcon,
  BinaryIcon as LucideBinaryIcon,
  BlocksIcon as LucideBlocksIcon,
  BoldIcon as LucideBoldIcon,
  BookOpenCheckIcon as LucideBookOpenCheckIcon,
  BookOpenIcon as LucideBookOpenIcon,
  BookUserIcon as LucideBookUserIcon,
  BookIcon as LucideBookIcon,
  BookmarkIcon as LucideBookmarkIcon,
  BuildingIcon as LucideBuildingIcon,
  CalendarCheck2Icon as LucideCalendarCheck2Icon,
  CalendarDaysIcon as LucideCalendarDaysIcon,
  CalendarHeartIcon as LucideCalendarHeartIcon,
  CalendarRangeIcon as LucideCalendarRangeIcon,
  CalendarSearchIcon as LucideCalendarSearchIcon,
  CalendarX2Icon as LucideCalendarX2Icon,
  CalendarIcon as LucideCalendarIcon,
  ChartBarIcon as LucideChartBarIcon,
  ChartLineIcon as LucideChartLineIcon,
  CheckCheckIcon as LucideCheckCheckIcon,
  CheckIcon as LucideCheckIcon,
  ChevronDownIcon as LucideChevronDownIcon,
  ChevronLeftIcon as LucideChevronLeftIcon,
  ChevronRightIcon as LucideChevronRightIcon,
  ChevronUpIcon as LucideChevronUpIcon,
  ChevronsDownUpIcon as LucideChevronsDownUpIcon,
  ChevronsLeftIcon as LucideChevronsLeftIcon,
  ChevronsRightIcon as LucideChevronsRightIcon,
  ChevronsUpDownIcon as LucideChevronsUpDownIcon,
  CircleAlertIcon as LucideCircleAlertIcon,
  CircleArrowUpIcon as LucideCircleArrowUpIcon,
  CircleCheckBigIcon as LucideCircleCheckBigIcon,
  CircleCheckIcon as LucideCircleCheckIcon,
  CircleHelpIcon as LucideCircleHelpIcon,
  CirclePlusIcon as LucideCirclePlusIcon,
  CircleXIcon as LucideCircleXIcon,
  CircleIcon as LucideCircleIcon,
  ClipboardCheckIcon as LucideClipboardCheckIcon,
  ClipboardIcon as LucideClipboardIcon,
  ClockIcon as LucideClockIcon,
  CodeIcon as LucideCodeIcon,
  Columns3Icon as LucideColumns3Icon,
  CommandIcon as LucideCommandIcon,
  ContactIcon as LucideContactIcon,
  CopyIcon as LucideCopyIcon,
  CornerDownLeftIcon as LucideCornerDownLeftIcon,
  CornerDownRightIcon as LucideCornerDownRightIcon,
  CreditCardIcon as LucideCreditCardIcon,
  DiscIcon as LucideDiscIcon,
  DotIcon as LucideDotIcon,
  DownloadIcon as LucideDownloadIcon,
  EllipsisVerticalIcon as LucideEllipsisVerticalIcon,
  EllipsisIcon as LucideEllipsisIcon,
  ExternalLinkIcon as LucideExternalLinkIcon,
  EyeOffIcon as LucideEyeOffIcon,
  EyeIcon as LucideEyeIcon,
  FileDownIcon as LucideFileDownIcon,
  FileTextIcon as LucideFileTextIcon,
  FileIcon as LucideFileIcon,
  FilterIcon as LucideFilterIcon,
  FingerprintIcon as LucideFingerprintIcon,
  FlagIcon as LucideFlagIcon,
  FolderIcon as LucideFolderIcon,
  GiftIcon as LucideGiftIcon,
  GitMergeIcon as LucideGitMergeIcon,
  GlobeIcon as LucideGlobeIcon,
  Grid3x3Icon as LucideGrid3x3Icon,
  HandshakeIcon as LucideHandshakeIcon,
  InfoIcon as LucideInfoIcon,
  ItalicIcon as LucideItalicIcon,
  KeyIcon as LucideKeyIcon,
  LayersIcon as LucideLayersIcon,
  LayoutDashboardIcon as LucideLayoutDashboardIcon,
  Link2Icon as LucideLink2Icon,
  LinkIcon as LucideLinkIcon,
  ListFilterIcon as LucideListFilterIcon,
  LoaderIcon as LucideLoaderIcon,
  LockOpenIcon as LucideLockOpenIcon,
  LockIcon as LucideLockIcon,
  LogOutIcon as LucideLogOutIcon,
  MailOpenIcon as LucideMailOpenIcon,
  MailIcon as LucideMailIcon,
  MapPinIcon as LucideMapPinIcon,
  MapIcon as LucideMapIcon,
  MenuIcon as LucideMenuIcon,
  MessageCircleIcon as LucideMessageCircleIcon,
  MessagesSquareIcon as LucideMessagesSquareIcon,
  MicOffIcon as LucideMicOffIcon,
  MicIcon as LucideMicIcon,
  MonitorIcon as LucideMonitorIcon,
  MoonIcon as LucideMoonIcon,
  PaintbrushIcon as LucidePaintbrushIcon,
  PaperclipIcon as LucidePaperclipIcon,
  PauseIcon as LucidePauseIcon,
  PencilIcon as LucidePencilIcon,
  PhoneCallIcon as LucidePhoneCallIcon,
  PhoneIncomingIcon as LucidePhoneIncomingIcon,
  PhoneOffIcon as LucidePhoneOffIcon,
  PhoneOutgoingIcon as LucidePhoneOutgoingIcon,
  PhoneIcon as LucidePhoneIcon,
  PlayIcon as LucidePlayIcon,
  PlusIcon as LucidePlusIcon,
  RefreshCcwIcon as LucideRefreshCcwIcon,
  RefreshCwIcon as LucideRefreshCwIcon,
  RepeatIcon as LucideRepeatIcon,
  RocketIcon as LucideRocketIcon,
  RotateCcwIcon as LucideRotateCcwIcon,
  RotateCwIcon as LucideRotateCwIcon,
  SearchIcon as LucideSearchIcon,
  SendIcon as LucideSendIcon,
  SettingsIcon as LucideSettingsIcon,
  Share2Icon as LucideShare2Icon,
  ShieldCheckIcon as LucideShieldCheckIcon,
  ShieldIcon as LucideShieldIcon,
  ShuffleIcon as LucideShuffleIcon,
  SlidersHorizontalIcon as LucideSlidersHorizontalIcon,
  SlidersVerticalIcon as LucideSlidersVerticalIcon,
  SmartphoneIcon as LucideSmartphoneIcon,
  SparklesIcon as LucideSparklesIcon,
  SplitIcon as LucideSplitIcon,
  SquareCheckIcon as LucideSquareCheckIcon,
  SquarePenIcon as LucideSquarePenIcon,
  StarIcon as LucideStarIcon,
  SunIcon as LucideSunIcon,
  SunriseIcon as LucideSunriseIcon,
  SunsetIcon as LucideSunsetIcon,
  TagsIcon as LucideTagsIcon,
  TerminalIcon as LucideTerminalIcon,
  Trash2Icon as LucideTrash2Icon,
  TrashIcon as LucideTrashIcon,
  TriangleAlertIcon as LucideTriangleAlertIcon,
  UploadIcon as LucideUploadIcon,
  UserCheckIcon as LucideUserCheckIcon,
  UserPlusIcon as LucideUserPlusIcon,
  UserXIcon as LucideUserXIcon,
  UserIcon as LucideUserIcon,
  UsersIcon as LucideUsersIcon,
  VenetianMaskIcon as LucideVenetianMaskIcon,
  VideoIcon as LucideVideoIcon,
  WaypointsIcon as LucideWaypointsIcon,
  WebhookIcon as LucideWebhookIcon,
  XIcon as LucideXIcon,
  ZapIcon as LucideZapIcon,
} from "lucide-react";

export interface IconProps {
  size?: number;
  className?: string;
}

function createIcon(Icon: LucideIcon) {
  return function WrappedIcon({ size, className }: IconProps) {
    return <Icon size={size} className={className} />;
  };
}

export const ActivityIcon = createIcon(LucideActivityIcon); // activity
export const ArrowDownIcon = createIcon(LucideArrowDownIcon); // arrow-down
export const ArrowLeftIcon = createIcon(LucideArrowLeftIcon); // arrow-left
export const ArrowRightIcon = createIcon(LucideArrowRightIcon); // arrow-right
export const ArrowUpRightIcon = createIcon(LucideArrowUpRightIcon); // arrow-up-right
export const ArrowUpIcon = createIcon(LucideArrowUpIcon); // arrow-up
export const AsteriskIcon = createIcon(LucideAsteriskIcon); // asterisk
export const AtSignIcon = createIcon(LucideAtSignIcon); // at-sign
export const AtomIcon = createIcon(LucideAtomIcon); // atom
export const BadgeCheckIcon = createIcon(LucideBadgeCheckIcon); // badge-check
export const BanIcon = createIcon(LucideBanIcon); // ban
export const BellIcon = createIcon(LucideBellIcon); // bell
export const BinaryIcon = createIcon(LucideBinaryIcon); // binary
export const BlocksIcon = createIcon(LucideBlocksIcon); // blocks
export const BoldIcon = createIcon(LucideBoldIcon); // bold
export const BookOpenCheckIcon = createIcon(LucideBookOpenCheckIcon); // book-open-check
export const BookOpenIcon = createIcon(LucideBookOpenIcon); // book-open
export const BookUserIcon = createIcon(LucideBookUserIcon); // book-user
export const BookIcon = createIcon(LucideBookIcon); // book
export const BookmarkIcon = createIcon(LucideBookmarkIcon); // bookmark
export const BuildingIcon = createIcon(LucideBuildingIcon); // building
export const CalendarCheck2Icon = createIcon(LucideCalendarCheck2Icon); // calendar-check-2
export const CalendarDaysIcon = createIcon(LucideCalendarDaysIcon); // calendar-days
export const CalendarHeartIcon = createIcon(LucideCalendarHeartIcon); // calendar-heart
export const CalendarRangeIcon = createIcon(LucideCalendarRangeIcon); // calendar-range
export const CalendarSearchIcon = createIcon(LucideCalendarSearchIcon); // calendar-search
export const CalendarX2Icon = createIcon(LucideCalendarX2Icon); // calendar-x-2
export const CalendarIcon = createIcon(LucideCalendarIcon); // calendar
export const ChartBarIcon = createIcon(LucideChartBarIcon); // chart-bar
export const ChartLineIcon = createIcon(LucideChartLineIcon); // chart-line
export const CheckCheckIcon = createIcon(LucideCheckCheckIcon); // check-check
export const CheckIcon = createIcon(LucideCheckIcon); // check
export const ChevronDownIcon = createIcon(LucideChevronDownIcon); // chevron-down
export const ChevronLeftIcon = createIcon(LucideChevronLeftIcon); // chevron-left
export const ChevronRightIcon = createIcon(LucideChevronRightIcon); // chevron-right
export const ChevronUpIcon = createIcon(LucideChevronUpIcon); // chevron-up
export const ChevronsDownUpIcon = createIcon(LucideChevronsDownUpIcon); // chevrons-down-up
export const ChevronsLeftIcon = createIcon(LucideChevronsLeftIcon); // chevrons-left
export const ChevronsRightIcon = createIcon(LucideChevronsRightIcon); // chevrons-right
export const ChevronsUpDownIcon = createIcon(LucideChevronsUpDownIcon); // chevrons-up-down
export const CircleAlertIcon = createIcon(LucideCircleAlertIcon); // circle-alert
export const CircleArrowUpIcon = createIcon(LucideCircleArrowUpIcon); // circle-arrow-up
export const CircleCheckBigIcon = createIcon(LucideCircleCheckBigIcon); // circle-check-big
export const CircleCheckIcon = createIcon(LucideCircleCheckIcon); // circle-check
export const CircleHelpIcon = createIcon(LucideCircleHelpIcon); // circle-help
export const CirclePlusIcon = createIcon(LucideCirclePlusIcon); // circle-plus
export const CircleXIcon = createIcon(LucideCircleXIcon); // circle-x
export const CircleIcon = createIcon(LucideCircleIcon); // circle
export const ClipboardCheckIcon = createIcon(LucideClipboardCheckIcon); // clipboard-check
export const ClipboardIcon = createIcon(LucideClipboardIcon); // clipboard
export const ClockIcon = createIcon(LucideClockIcon); // clock
export const CodeIcon = createIcon(LucideCodeIcon); // code
export const Columns3Icon = createIcon(LucideColumns3Icon); // columns-3
export const CommandIcon = createIcon(LucideCommandIcon); // command
export const ContactIcon = createIcon(LucideContactIcon); // contact
export const CopyIcon = createIcon(LucideCopyIcon); // copy
export const CornerDownLeftIcon = createIcon(LucideCornerDownLeftIcon); // corner-down-left
export const CornerDownRightIcon = createIcon(LucideCornerDownRightIcon); // corner-down-right
export const CreditCardIcon = createIcon(LucideCreditCardIcon); // credit-card
export const DiscIcon = createIcon(LucideDiscIcon); // disc
export const DotIcon = createIcon(LucideDotIcon); // dot
export const DownloadIcon = createIcon(LucideDownloadIcon); // download
export const EllipsisVerticalIcon = createIcon(LucideEllipsisVerticalIcon); // ellipsis-vertical
export const EllipsisIcon = createIcon(LucideEllipsisIcon); // ellipsis
export const ExternalLinkIcon = createIcon(LucideExternalLinkIcon); // external-link
export const EyeOffIcon = createIcon(LucideEyeOffIcon); // eye-off
export const EyeIcon = createIcon(LucideEyeIcon); // eye
export const FileDownIcon = createIcon(LucideFileDownIcon); // file-down
export const FileTextIcon = createIcon(LucideFileTextIcon); // file-text
export const FileIcon = createIcon(LucideFileIcon); // file
export const FilterIcon = createIcon(LucideFilterIcon); // filter
export const FingerprintIcon = createIcon(LucideFingerprintIcon); // fingerprint
export const FlagIcon = createIcon(LucideFlagIcon); // flag
export const FolderIcon = createIcon(LucideFolderIcon); // folder
export const GiftIcon = createIcon(LucideGiftIcon); // gift
export const GitMergeIcon = createIcon(LucideGitMergeIcon); // git-merge
export const GlobeIcon = createIcon(LucideGlobeIcon); // globe
export const Grid3x3Icon = createIcon(LucideGrid3x3Icon); // grid-3x3
export const HandshakeIcon = createIcon(LucideHandshakeIcon); // handshake
export const InfoIcon = createIcon(LucideInfoIcon); // info
export const ItalicIcon = createIcon(LucideItalicIcon); // italic
export const KeyIcon = createIcon(LucideKeyIcon); // key
export const LayersIcon = createIcon(LucideLayersIcon); // layers
export const LayoutDashboardIcon = createIcon(LucideLayoutDashboardIcon); // layout-dashboard
export const Link2Icon = createIcon(LucideLink2Icon); // link-2
export const LinkIcon = createIcon(LucideLinkIcon); // link
export const ListFilterIcon = createIcon(LucideListFilterIcon); // list-filter
export const LoaderIcon = createIcon(LucideLoaderIcon); // loader
export const LockOpenIcon = createIcon(LucideLockOpenIcon); // lock-open
export const LockIcon = createIcon(LucideLockIcon); // lock
export const LogOutIcon = createIcon(LucideLogOutIcon); // log-out
export const MailOpenIcon = createIcon(LucideMailOpenIcon); // mail-open
export const MailIcon = createIcon(LucideMailIcon); // mail
export const MapPinIcon = createIcon(LucideMapPinIcon); // map-pin
export const MapIcon = createIcon(LucideMapIcon); // map
export const MenuIcon = createIcon(LucideMenuIcon); // menu
export const MessageCircleIcon = createIcon(LucideMessageCircleIcon); // message-circle
export const MessagesSquareIcon = createIcon(LucideMessagesSquareIcon); // messages-square
export const MicOffIcon = createIcon(LucideMicOffIcon); // mic-off
export const MicIcon = createIcon(LucideMicIcon); // mic
export const MonitorIcon = createIcon(LucideMonitorIcon); // monitor
export const MoonIcon = createIcon(LucideMoonIcon); // moon
export const PaintbrushIcon = createIcon(LucidePaintbrushIcon); // paintbrush
export const PaperclipIcon = createIcon(LucidePaperclipIcon); // paperclip
export const PauseIcon = createIcon(LucidePauseIcon); // pause
export const PencilIcon = createIcon(LucidePencilIcon); // pencil
export const PhoneCallIcon = createIcon(LucidePhoneCallIcon); // phone-call
export const PhoneIncomingIcon = createIcon(LucidePhoneIncomingIcon); // phone-incoming
export const PhoneOffIcon = createIcon(LucidePhoneOffIcon); // phone-off
export const PhoneOutgoingIcon = createIcon(LucidePhoneOutgoingIcon); // phone-outgoing
export const PhoneIcon = createIcon(LucidePhoneIcon); // phone
export const PlayIcon = createIcon(LucidePlayIcon); // play
export const PlusIcon = createIcon(LucidePlusIcon); // plus
export const RefreshCcwIcon = createIcon(LucideRefreshCcwIcon); // refresh-ccw
export const RefreshCwIcon = createIcon(LucideRefreshCwIcon); // refresh-cw
export const RepeatIcon = createIcon(LucideRepeatIcon); // repeat
export const RocketIcon = createIcon(LucideRocketIcon); // rocket
export const RotateCcwIcon = createIcon(LucideRotateCcwIcon); // rotate-ccw
export const RotateCwIcon = createIcon(LucideRotateCwIcon); // rotate-cw
export const SearchIcon = createIcon(LucideSearchIcon); // search
export const SendIcon = createIcon(LucideSendIcon); // send
export const SettingsIcon = createIcon(LucideSettingsIcon); // settings
export const Share2Icon = createIcon(LucideShare2Icon); // share-2
export const ShieldCheckIcon = createIcon(LucideShieldCheckIcon); // shield-check
export const ShieldIcon = createIcon(LucideShieldIcon); // shield
export const ShuffleIcon = createIcon(LucideShuffleIcon); // shuffle
export const SlidersHorizontalIcon = createIcon(LucideSlidersHorizontalIcon); // sliders-horizontal
export const SlidersVerticalIcon = createIcon(LucideSlidersVerticalIcon); // sliders-vertical
export const SmartphoneIcon = createIcon(LucideSmartphoneIcon); // smartphone
export const SparklesIcon = createIcon(LucideSparklesIcon); // sparkles
export const SplitIcon = createIcon(LucideSplitIcon); // split
export const SquareCheckIcon = createIcon(LucideSquareCheckIcon); // square-check
export const SquarePenIcon = createIcon(LucideSquarePenIcon); // square-pen
export const StarIcon = createIcon(LucideStarIcon); // star
export const SunIcon = createIcon(LucideSunIcon); // sun
export const SunriseIcon = createIcon(LucideSunriseIcon); // sunrise
export const SunsetIcon = createIcon(LucideSunsetIcon); // sunset
export const TagsIcon = createIcon(LucideTagsIcon); // tags
export const TerminalIcon = createIcon(LucideTerminalIcon); // terminal
export const Trash2Icon = createIcon(LucideTrash2Icon); // trash-2
export const TrashIcon = createIcon(LucideTrashIcon); // trash
export const TriangleAlertIcon = createIcon(LucideTriangleAlertIcon); // triangle-alert
export const UploadIcon = createIcon(LucideUploadIcon); // upload
export const UserCheckIcon = createIcon(LucideUserCheckIcon); // user-check
export const UserPlusIcon = createIcon(LucideUserPlusIcon); // user-plus
export const UserXIcon = createIcon(LucideUserXIcon); // user-x
export const UserIcon = createIcon(LucideUserIcon); // user
export const UsersIcon = createIcon(LucideUsersIcon); // users
export const VenetianMaskIcon = createIcon(LucideVenetianMaskIcon); // venetian-mask
export const VideoIcon = createIcon(LucideVideoIcon); // video
export const WaypointsIcon = createIcon(LucideWaypointsIcon); // waypoints
export const WebhookIcon = createIcon(LucideWebhookIcon); // webhook
export const XIcon = createIcon(LucideXIcon); // x
export const ZapIcon = createIcon(LucideZapIcon); // zap
