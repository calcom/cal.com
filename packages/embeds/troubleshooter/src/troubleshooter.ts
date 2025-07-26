import {
  checkEmbedInstallation,
  checkNetworkRequests,
  checkEmbedElements,
  checkErrors,
  checkConfiguration,
  checkSecurityPolicies,
  generateRecommendations,
} from "./diagnostics";
import { setupConsoleInterception, getNetworkEntriesFromPerformance } from "./interceptors";
import { styles } from "./styles";
import type { ConsoleError, NetworkLogEntry, DiagnosticResults, DiagnosticCheck } from "./types";
import { getUITemplate, updateConsoleTab, updateNetworkTab } from "./ui";

export class CalEmbedTroubleshooter {
  private isOpen = false;
  private container: HTMLElement | null = null;
  private consoleErrors: ConsoleError[] = [];
  private networkLog: NetworkLogEntry[] = [];
  private networkPollingInterval: number | null = null;
  private isInitialized = false;
  private isEnabled = true;

  constructor() {
    this.init();
  }

  private init(): void {
    // Prevent repeat initialization
    if (this.isInitialized) {
      console.warn("CalEmbedTroubleshooter is already initialized");
      return;
    }

    // Check if globally disabled
    if (window.__calEmbedTroubleshooterDisabled) {
      this.isEnabled = false;
      return;
    }

    this.isInitialized = true;
    this.setupConsoleInterception();
    this.startNetworkPolling();
    this.createUI();
    this.runDiagnostics();
    this.show();
  }

  private setupConsoleInterception(): void {
    setupConsoleInterception(this.consoleErrors);
  }

  private getNetworkEntries(): void {
    this.networkLog = getNetworkEntriesFromPerformance();
  }

  private startNetworkPolling(): void {
    // Poll every 2 seconds for new network requests
    this.networkPollingInterval = window.setInterval(() => {
      if (this.isOpen) {
        const currentTab = this.container?.querySelector(".cal-tab.active") as HTMLElement;
        if (currentTab?.dataset.tab === "network") {
          this.getNetworkEntries();
          const container = document.getElementById("tab-network");
          if (container) {
            updateNetworkTab(container, this.networkLog);
          }
        }
      }
    }, 2000);
  }

  private createUI(): void {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    this.container = document.createElement("div");
    this.container.id = "cal-troubleshooter";
    this.container.innerHTML = getUITemplate();
    document.body.appendChild(this.container);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.getElementById("cal-troubleshooter-close")?.addEventListener("click", () => {
      this.hide();
    });

    this.container?.querySelectorAll(".cal-tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        const tabName = target.dataset.tab;
        if (tabName) {
          this.switchTab(tabName);
        }
      });
    });
  }

  private switchTab(tabName: string): void {
    this.container?.querySelectorAll(".cal-tab").forEach((tab) => {
      tab.classList.toggle("active", (tab as HTMLElement).dataset.tab === tabName);
    });

    this.container?.querySelectorAll(".cal-tab-content").forEach((content) => {
      content.classList.toggle("active", content.id === `tab-${tabName}`);
    });

    if (tabName === "console") {
      const container = document.getElementById("tab-console");
      if (container) {
        updateConsoleTab(container, this.consoleErrors);
      }
    } else if (tabName === "network") {
      const container = document.getElementById("tab-network");
      if (container) {
        this.getNetworkEntries();
        updateNetworkTab(container, this.networkLog);
      }
    }
  }

  private async runDiagnostics(): Promise<void> {
    this.getNetworkEntries();
    const diagnostics: DiagnosticResults = {
      embed: await checkEmbedInstallation(),
      network: await checkNetworkRequests(),
      elements: checkEmbedElements(),
      errors: checkErrors(this.consoleErrors, this.networkLog),
      configuration: checkConfiguration(),
      security: checkSecurityPolicies(),
      recommendations: generateRecommendations(),
    };

    this.displayResults(diagnostics);
  }

  private displayResults(diagnostics: DiagnosticResults): void {
    const content = document.getElementById("tab-diagnostics");
    if (!content) return;

    let html = "";
    Object.values(diagnostics).forEach((section) => {
      if (!section.checks || section.checks.length === 0) return;

      const statusClass = `cal-status-${section.status}`;
      const sectionId = section.title.toLowerCase().replace(/\s+/g, "-");

      html += `
        <div class="cal-diagnostic-section">
          <div class="cal-diagnostic-header" onclick="window.__calEmbedTroubleshooter.toggleSection('${sectionId}')">
            <span>${section.title}</span>
            <span class="cal-diagnostic-status ${statusClass}">${section.status.toUpperCase()}</span>
          </div>
          <div class="cal-diagnostic-body" id="section-${sectionId}">
            ${section.checks
              .map(
                (check: DiagnosticCheck) => `
              <div class="cal-diagnostic-item">
                <span class="cal-diagnostic-icon">${check.icon}</span>
                <div class="cal-diagnostic-details">
                  <div>${check.text}</div>
                  ${
                    check.details
                      ? `<div style="color: #6b7280; font-size: 12px; margin-top: 2px;">${check.details}</div>`
                      : ""
                  }
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `;
    });

    const hasErrors = Object.values(diagnostics).some((d) => d.status === "error");
    if (hasErrors) {
      html += `
        <div class="cal-recommendation">
          <div class="cal-recommendation-title">Need Help?</div>
          <div class="cal-recommendation-text">
            Check the Console and Network tabs for more details, or visit 
            <a href="https://cal.com/docs/introduction/quick-start/embed" target="_blank">Cal.com Embed Docs</a>
          </div>
        </div>
      `;
    }

    html +=
      '<button class="cal-button cal-refresh-btn" onclick="window.__calEmbedTroubleshooter.refresh()">Refresh Diagnostics</button>';

    content.innerHTML = html;

    Object.values(diagnostics).forEach((section) => {
      if (section.status === "error" || section.status === "warning") {
        const sectionId = section.title.toLowerCase().replace(/\s+/g, "-");
        this.toggleSection(sectionId);
      }
    });
  }

  toggleSection(sectionId: string): void {
    const section = document.getElementById(`section-${sectionId}`);
    if (section) {
      section.classList.toggle("active");
    }
  }

  refresh(): void {
    const content = document.getElementById("tab-diagnostics");
    if (content) {
      content.innerHTML = '<div class="cal-loading">Running diagnostics...</div>';
    }
    this.runDiagnostics();
  }

  private show(): void {
    if (this.container) {
      this.container.style.display = "flex";
      this.isOpen = true;
    }
  }

  private hide(): void {
    if (this.container) {
      this.container.style.display = "none";
      this.isOpen = false;
    }
  }

  toggle(): void {
    if (!this.isEnabled || !this.isInitialized) {
      console.log("CalEmbedTroubleshooter is disabled or not initialized");
      return;
    }

    if (this.isOpen) {
      this.hide();
    } else {
      this.refresh();
      this.show();
    }
  }

  disable(): void {
    this.isEnabled = false;
    this.hide();
    window.__calEmbedTroubleshooterDisabled = true;
  }

  enable(): void {
    this.isEnabled = true;
    delete window.__calEmbedTroubleshooterDisabled;
    if (!this.isInitialized) {
      this.init();
    }
  }

  destroy(): void {
    if (this.networkPollingInterval) {
      clearInterval(this.networkPollingInterval);
    }
    if (this.container) {
      this.container.remove();
    }
    this.isInitialized = false;
    delete window.__calEmbedTroubleshooter;
  }
}
