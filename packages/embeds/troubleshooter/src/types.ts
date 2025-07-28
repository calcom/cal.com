export interface ConsoleError {
  timestamp: Date;
  message: string;
  stack?: string;
}

export interface NetworkLogEntry {
  url: string;
  method: string;
  status?: number;
  error?: string;
  duration: number;
  timestamp: Date;
  type?: string;
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
  destroy(): void;
}
