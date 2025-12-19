#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Map of PascalCase lucide-react component names to kebab-case icon names
const ICON_NAME_MAP = {
  Activity: 'activity',
  ArrowDown: 'arrow-down',
  ArrowLeft: 'arrow-left',
  ArrowRight: 'arrow-right',
  ArrowUp: 'arrow-up',
  ArrowUpRight: 'arrow-up-right',
  Asterisk: 'asterisk',
  AtSign: 'at-sign',
  Atom: 'atom',
  BadgeCheck: 'badge-check',
  Ban: 'ban',
  Bell: 'bell',
  Binary: 'binary',
  Blocks: 'blocks',
  Bold: 'bold',
  Book: 'book',
  BookOpen: 'book-open',
  BookOpenCheck: 'book-open-check',
  BookUser: 'book-user',
  Bookmark: 'bookmark',
  Building: 'building',
  Calendar: 'calendar',
  CalendarCheck2: 'calendar-check-2',
  CalendarDays: 'calendar-days',
  CalendarHeart: 'calendar-heart',
  CalendarRange: 'calendar-range',
  CalendarSearch: 'calendar-search',
  CalendarX2: 'calendar-x-2',
  ChartBar: 'chart-bar',
  ChartLine: 'chart-line',
  Check: 'check',
  CheckCheck: 'check-check',
  ChevronDown: 'chevron-down',
  ChevronDownIcon: 'chevron-down',
  ChevronLeft: 'chevron-left',
  ChevronRight: 'chevron-right',
  ChevronRightIcon: 'chevron-right',
  ChevronUp: 'chevron-up',
  ChevronsDownUp: 'chevrons-down-up',
  ChevronsLeft: 'chevrons-left',
  ChevronsRight: 'chevrons-right',
  ChevronsUpDown: 'chevrons-up-down',
  ChevronsUpDownIcon: 'chevrons-up-down',
  Circle: 'circle',
  CircleAlert: 'circle-alert',
  CircleArrowUp: 'circle-arrow-up',
  CircleCheck: 'circle-check',
  CircleCheckBig: 'circle-check-big',
  CircleHelp: 'circle-help',
  CirclePlus: 'circle-plus',
  CircleX: 'circle-x',
  Clipboard: 'clipboard',
  ClipboardCheck: 'clipboard-check',
  Clock: 'clock',
  Code: 'code',
  Columns3: 'columns-3',
  Command: 'command',
  Contact: 'contact',
  Copy: 'copy',
  CornerDownLeft: 'corner-down-left',
  CornerDownRight: 'corner-down-right',
  CreditCard: 'credit-card',
  Disc: 'disc',
  Dot: 'dot',
  Download: 'download',
  Ellipsis: 'ellipsis',
  EllipsisVertical: 'ellipsis-vertical',
  ExternalLink: 'external-link',
  Eye: 'eye',
  EyeOff: 'eye-off',
  File: 'file',
  FileDown: 'file-down',
  FileText: 'file-text',
  Filter: 'filter',
  Fingerprint: 'fingerprint',
  Flag: 'flag',
  Folder: 'folder',
  Gift: 'gift',
  GitMerge: 'git-merge',
  Github: 'github',
  Globe: 'globe',
  Grid3x3: 'grid-3x3',
  Handshake: 'handshake',
  Info: 'info',
  Italic: 'italic',
  Key: 'key',
  Layers: 'layers',
  LayoutDashboard: 'layout-dashboard',
  Link: 'link',
  Link2: 'link-2',
  LinkIcon: 'link',
  ListFilter: 'list-filter',
  Loader: 'loader',
  Lock: 'lock',
  LockOpen: 'lock-open',
  LogOut: 'log-out',
  Mail: 'mail',
  MailOpen: 'mail-open',
  Map: 'map',
  MapPin: 'map-pin',
  Menu: 'menu',
  MessageCircle: 'message-circle',
  MessagesSquare: 'messages-square',
  Mic: 'mic',
  MicOff: 'mic-off',
  Monitor: 'monitor',
  Moon: 'moon',
  Paintbrush: 'paintbrush',
  Paperclip: 'paperclip',
  Pause: 'pause',
  Pencil: 'pencil',
  Phone: 'phone',
  PhoneCall: 'phone-call',
  PhoneIncoming: 'phone-incoming',
  PhoneOff: 'phone-off',
  PhoneOutgoing: 'phone-outgoing',
  Play: 'play',
  Plus: 'plus',
  RefreshCcw: 'refresh-ccw',
  RefreshCw: 'refresh-cw',
  Repeat: 'repeat',
  Rocket: 'rocket',
  RotateCcw: 'rotate-ccw',
  RotateCw: 'rotate-cw',
  Search: 'search',
  Send: 'send',
  Settings: 'settings',
  Share2: 'share-2',
  Shield: 'shield',
  ShieldCheck: 'shield-check',
  Shuffle: 'shuffle',
  SlidersHorizontal: 'sliders-horizontal',
  SlidersVertical: 'sliders-vertical',
  Smartphone: 'smartphone',
  Sparkles: 'sparkles',
  Split: 'split',
  SquareCheck: 'square-check',
  SquarePen: 'square-pen',
  Star: 'star',
  Sun: 'sun',
  Sunrise: 'sunrise',
  Sunset: 'sunset',
  Tags: 'tags',
  Terminal: 'terminal',
  Trash: 'trash',
  Trash2: 'trash-2',
  Trello: 'trello',
  TriangleAlert: 'triangle-alert',
  Upload: 'upload',
  User: 'user',
  UserCheck: 'user-check',
  UserPlus: 'user-plus',
  UserX: 'user-x',
  Users: 'users',
  VenetianMask: 'venetian-mask',
  Video: 'video',
  Waypoints: 'waypoints',
  Webhook: 'webhook',
  X: 'x',
  Zap: 'zap',
};

// Files to skip (Icon component itself, etc.)
const SKIP_FILES = [
  'packages/ui/components/icon/Icon.tsx',
  'packages/ui/components/icon/index.ts',
  'scripts/migrate-icons.mjs',
  'scripts/revert-icons.mjs',
];

function processFile(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  
  if (SKIP_FILES.some(skip => relativePath.includes(skip))) {
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Find lucide-react imports
  const lucideImportMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/);
  if (!lucideImportMatch) {
    return false;
  }
  
  const importedIcons = lucideImportMatch[1]
    .split(',')
    .map(s => s.trim())
    .filter(s => {
      const baseName = s.split(' as ')[0].trim();
      return s && ICON_NAME_MAP[baseName];
    });
  
  if (importedIcons.length === 0) {
    return false;
  }
  
  // Check if Icon is already imported from @calcom/ui
  const hasIconImport = content.includes("{ Icon }") || 
                        content.includes("{ Icon,") ||
                        content.includes(", Icon }") ||
                        content.includes(", Icon,");
  
  // Replace each icon usage with <Icon name="...">
  let modified = false;
  const convertedIcons = [];
  
  for (const iconImport of importedIcons) {
    // Handle "X as Y" imports
    const parts = iconImport.split(' as ').map(s => s.trim());
    const originalName = parts[0];
    const usedName = parts[parts.length - 1];
    const kebabName = ICON_NAME_MAP[originalName];
    
    if (!kebabName) continue;
    
    // Replace self-closing tags: <IconName ... />
    const selfClosingRegex = new RegExp(`<${usedName}(\\s[^>]*?)?\\s*/>`, 'g');
    const newContent = content.replace(selfClosingRegex, (match, attrs) => {
      attrs = attrs || '';
      // Remove data-testid if it was added for the icon
      attrs = attrs.replace(/\s*data-testid="[^"]*-icon"\s*/g, ' ');
      attrs = attrs.trim();
      modified = true;
      convertedIcons.push(iconImport);
      return `<Icon name="${kebabName}"${attrs ? ' ' + attrs : ''} />`;
    });
    
    if (newContent !== content) {
      content = newContent;
    }
  }
  
  if (!modified) {
    return false;
  }
  
  // Remove the lucide-react import for icons we converted
  const uniqueConverted = [...new Set(convertedIcons)];
  const remainingIcons = importedIcons.filter(icon => !uniqueConverted.includes(icon));
  
  if (remainingIcons.length === 0) {
    // Remove entire lucide-react import
    content = content.replace(/import\s*\{[^}]+\}\s*from\s*['"]lucide-react['"];\n?/g, '');
  } else {
    // Update import to only include remaining icons
    const newImport = `import { ${remainingIcons.join(', ')} } from "lucide-react"`;
    content = content.replace(/import\s*\{[^}]+\}\s*from\s*['"]lucide-react['"]/g, newImport);
  }
  
  // Add Icon import if not present
  if (!hasIconImport && content.includes('<Icon ')) {
    // Find a good place to add the import
    const calcomUiMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]@calcom\/ui['"]/);
    if (calcomUiMatch) {
      // Add to existing @calcom/ui import
      const existingImports = calcomUiMatch[1];
      if (!existingImports.includes('Icon')) {
        content = content.replace(
          /import\s*\{([^}]+)\}\s*from\s*['"]@calcom\/ui['"]/,
          (match, imports) => `import { ${imports.trim()}, Icon } from "@calcom/ui"`
        );
      }
    } else {
      // Add new import after the first import
      content = content.replace(
        /(import[^;]+from\s*['"][^'"]+['"];)/,
        '$1\nimport { Icon } from "@calcom/ui";'
      );
    }
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`Reverted: ${relativePath}`);
    return true;
  }
  
  return false;
}

// Read file list from /tmp/lucide-files.txt
const fileList = fs.readFileSync('/tmp/lucide-files.txt', 'utf8');
const files = fileList.trim().split('\n').filter(f => f && !SKIP_FILES.some(skip => f.includes(skip)));

console.log(`Found ${files.length} files with lucide-react imports`);

let revertedCount = 0;
for (const file of files) {
  try {
    if (processFile(file)) {
      revertedCount++;
    }
  } catch (err) {
    console.error(`Error processing ${file}:`, err.message);
  }
}

console.log(`\nReverted ${revertedCount} files`);
