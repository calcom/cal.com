export interface FrameContext {
  isIframe: boolean;
  frameId: string;
  label: string;
  window: Window | null;
  document: Document | null;
  origin: string;
  selector?: string; // CSS selector to identify the iframe
}

export interface EmbedLocation {
  context: FrameContext;
  hasEmbed: boolean;
  embedLoaded: boolean;
  embedVersion?: string;
  origin: string;
  isCrossOrigin?: boolean;
}

export interface ConsoleError {
  timestamp: Date;
  message: string;
  stack?: string;
  context?: string;
}

export interface NetworkLogEntry {
  url: string;
  method: string;
  status?: number;
  error?: string;
  duration: number;
  timestamp: Date;
  type?: string;
  context?: string;
}

export interface NetworkLogGroup {
  context: string;
  entries: NetworkLogEntry[];
  isExpanded?: boolean;
}

export interface DiagnosticCheck {
  icon: string;
  status: "success" | "error" | "warning" | "info";
  text: string;
  details: string | null;
}

export interface DiagnosticSection {
  title: string;
  status: "success" | "error" | "warning" | "info";
  checks: DiagnosticCheck[];
}

export interface DiagnosticResults {
  embed: DiagnosticSection;
  network: DiagnosticSection;
  elements: DiagnosticSection;
  errors: DiagnosticSection;
  configuration: DiagnosticSection;
  security: DiagnosticSection;
  visibility: DiagnosticSection;
  recommendations: DiagnosticSection;
  notes?: DiagnosticSection;
}

export interface GroupedDiagnosticResults {
  context: string;
  diagnostics: DiagnosticResults;
  isExpanded?: boolean;
  selector?: string; // CSS selector for iframe identification
}

declare global {
  interface Window {
    Cal?: {
      loaded?: boolean;
      ns?: Record<string, unknown>;
      version?: string;
      fingerprint?: string;
      __config?: {
        calOrigin?: string;
      };
      config?: {
        forwardQueryParams?: boolean;
      };
    };
    __calEmbedTroubleshooter?: CalEmbedTroubleshooter;
  }
}

export interface CalEmbedTroubleshooter {
  toggle(): void;
  refresh(): void;
  toggleSection(sectionId: string): void;
  toggleNetworkSection(sectionId: string): void;
  toggleDiagnosticContext(contextId: string): void;
  destroy(): void;
}
