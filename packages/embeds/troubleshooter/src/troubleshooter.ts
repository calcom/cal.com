import {
  checkEmbedInstallation,
  checkNetworkRequests,
  checkEmbedElements,
  checkErrors,
  checkConfiguration,
  checkSecurityPolicies,
  checkIframeVisibility,
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
  private diagnosticsPollingInterval: number | null = null;
  private isInitialized = false;
  private isEnabled = true;
  private expandedSections: Set<string> = new Set();
  private isFirstLoad = true;

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
    this.startDiagnosticsPolling();
    this.createUI();
    this.runDiagnostics();
    this.updateConsoleTabIndicator();
    this.updateNetworkTabIndicator();
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

  private startDiagnosticsPolling(): void {
    // Poll every 1 second for diagnostics updates
    this.diagnosticsPollingInterval = window.setInterval(() => {
      if (this.isOpen) {
        const currentTab = this.container?.querySelector(".cal-tab.active") as HTMLElement;
        if (currentTab?.dataset.tab === "diagnostics") {
          this.runDiagnostics();
        }
        // Update tab indicators
        this.updateConsoleTabIndicator();
        this.updateNetworkTabIndicator();
      }
      // Ensure troubleshooter stays as last element in body
      this.ensureLastInBody();
    }, 1000);
  }

  private createUI(): void {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    this.container = document.createElement("div");
    this.container.id = "cal-troubleshooter";
    this.container.innerHTML = getUITemplate();
    document.body.appendChild(this.container);

    // Create toggle button
    const toggleButton = document.createElement("button");
    toggleButton.id = "cal-troubleshooter-toggle";
    toggleButton.innerHTML = "🔍";
    toggleButton.title = "Cal.com Embed Troubleshooter";
    toggleButton.style.display = "none"; // Initially hidden since troubleshooter starts shown
    document.body.appendChild(toggleButton);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.getElementById("cal-troubleshooter-close")?.addEventListener("click", () => {
      this.hide();
    });

    document.getElementById("cal-troubleshooter-toggle")?.addEventListener("click", () => {
      this.toggle();
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
        this.updateConsoleTabIndicator();
      }
    } else if (tabName === "network") {
      const container = document.getElementById("tab-network");
      if (container) {
        this.getNetworkEntries();
        updateNetworkTab(container, this.networkLog);
        this.updateNetworkTabIndicator();
      }
    }
  }

  private updateConsoleTabIndicator(): void {
    const consoleTab = document.querySelector('.cal-tab[data-tab="console"]');
    if (!consoleTab) return;

    // Remove existing indicator
    const existingIndicator = consoleTab.querySelector('.cal-tab-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }

    // Add indicator if there are errors
    if (this.consoleErrors.length > 0) {
      const indicator = document.createElement('span');
      indicator.className = 'cal-tab-indicator';
      indicator.textContent = this.consoleErrors.length.toString();
      indicator.style.cssText = `
        background: #dc2626;
        color: white;
        font-size: 10px;
        font-weight: bold;
        min-width: 16px;
        height: 16px;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-left: 4px;
        padding: 0 4px;
        vertical-align: middle;
      `;
      consoleTab.appendChild(indicator);
    }
  }

  private updateNetworkTabIndicator(): void {
    const networkTab = document.querySelector('.cal-tab[data-tab="network"]');
    if (!networkTab) return;

    // Remove existing indicator
    const existingIndicator = networkTab.querySelector('.cal-tab-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }

    // Count failed requests
    const failedRequests = this.networkLog.filter((req) => req.error || (req.status && req.status >= 400));
    
    // Add indicator if there are failed requests
    if (failedRequests.length > 0) {
      const indicator = document.createElement('span');
      indicator.className = 'cal-tab-indicator';
      indicator.textContent = failedRequests.length.toString();
      indicator.style.cssText = `
        background: #dc2626;
        color: white;
        font-size: 10px;
        font-weight: bold;
        min-width: 16px;
        height: 16px;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-left: 4px;
        padding: 0 4px;
        vertical-align: middle;
      `;
      networkTab.appendChild(indicator);
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
      visibility: checkIframeVisibility(),
      recommendations: generateRecommendations(),
    };

    this.displayResults(diagnostics);
    this.updateTabIndicators(diagnostics);
  }

  private updateTabIndicators(diagnostics: DiagnosticResults): void {
    const diagnosticsTab = document.querySelector('.cal-tab[data-tab="diagnostics"]');
    if (!diagnosticsTab) return;

    // Check if there are any errors or warnings
    const hasErrors = Object.values(diagnostics).some((d) => d.status === "error");
    const hasWarnings = Object.values(diagnostics).some((d) => d.status === "warning");

    // Remove existing indicators
    const existingIndicator = diagnosticsTab.querySelector('.cal-tab-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }

    // Add new indicator if needed
    if (hasErrors || hasWarnings) {
      const indicator = document.createElement('span');
      indicator.className = 'cal-tab-indicator';
      indicator.textContent = hasErrors ? '!' : '!';
      indicator.style.cssText = `
        background: ${hasErrors ? '#dc2626' : '#f59e0b'};
        color: white;
        font-size: 10px;
        font-weight: bold;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-left: 4px;
        vertical-align: middle;
      `;
      diagnosticsTab.appendChild(indicator);
    }
  }

  private displayResults(diagnostics: DiagnosticResults): void {
    const content = document.getElementById("tab-diagnostics");
    if (!content) return;

    // Save currently expanded sections before refresh
    if (!this.isFirstLoad) {
      this.expandedSections.clear();
      const expandedBodies = content.querySelectorAll(".cal-diagnostic-body.active");
      expandedBodies.forEach((body) => {
        const id = body.id.replace("section-", "");
        this.expandedSections.add(id);
      });
    }

    let html = "";
    
    // Sort sections by priority: error > warning > info/success
    const statusPriority = {
      error: 0,
      warning: 1,
      info: 2,
      success: 3,
    };
    
    const sortedSections = Object.values(diagnostics).sort((a, b) => {
      const priorityA = statusPriority[a.status] ?? 3;
      const priorityB = statusPriority[b.status] ?? 3;
      return priorityA - priorityB;
    });
    
    sortedSections.forEach((section) => {
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

    // Add auto-refresh indicator
    html += '<div style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 16px;">Auto-refreshing every second</div>';

    content.innerHTML = html;

    // Restore expanded state or auto-expand on first load
    if (this.isFirstLoad) {
      // Auto-expand error and warning sections on first load
      Object.values(diagnostics).forEach((section) => {
        if (section.status === "error" || section.status === "warning") {
          const sectionId = section.title.toLowerCase().replace(/\s+/g, "-");
          this.toggleSection(sectionId);
          this.expandedSections.add(sectionId);
        }
      });
      this.isFirstLoad = false;
    } else {
      // Restore previously expanded sections
      this.expandedSections.forEach((sectionId) => {
        const sectionBody = document.getElementById(`section-${sectionId}`);
        if (sectionBody) {
          sectionBody.classList.add("active");
        }
      });
    }
  }

  toggleSection(sectionId: string): void {
    const section = document.getElementById(`section-${sectionId}`);
    if (section) {
      section.classList.toggle("active");
      
      // Update our tracking of expanded sections
      if (section.classList.contains("active")) {
        this.expandedSections.add(sectionId);
      } else {
        this.expandedSections.delete(sectionId);
      }
    }
  }

  refresh(): void {
    const content = document.getElementById("tab-diagnostics");
    if (content) {
      content.innerHTML = '<div class="cal-loading">Running diagnostics...</div>';
    }
    this.runDiagnostics();
  }

  private ensureLastInBody(): void {
    const toggleButton = document.getElementById("cal-troubleshooter-toggle");
    
    // Ensure toggle button is second to last and container is last
    if (toggleButton && toggleButton.parentElement === document.body) {
      const lastChild = document.body.lastElementChild;
      const secondLastChild = lastChild?.previousElementSibling;
      
      // If toggle button is not second to last, move it
      if (secondLastChild !== toggleButton) {
        document.body.appendChild(toggleButton);
      }
    }
    
    // Ensure container is always last
    if (this.container && this.container.parentElement === document.body) {
      const lastChild = document.body.lastElementChild;
      if (lastChild !== this.container) {
        document.body.appendChild(this.container);
      }
    }
  }

  private show(): void {
    if (this.container) {
      this.container.style.display = "flex";
      this.isOpen = true;
      this.ensureLastInBody();
      const toggleButton = document.getElementById("cal-troubleshooter-toggle");
      if (toggleButton) {
        toggleButton.style.display = "none";
      }
    }
  }

  private hide(): void {
    if (this.container) {
      this.container.style.display = "none";
      this.isOpen = false;
      const toggleButton = document.getElementById("cal-troubleshooter-toggle");
      if (toggleButton) {
        toggleButton.style.display = "flex";
      }
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
    if (this.diagnosticsPollingInterval) {
      clearInterval(this.diagnosticsPollingInterval);
    }
    if (this.container) {
      this.container.remove();
    }
    const toggleButton = document.getElementById("cal-troubleshooter-toggle");
    if (toggleButton) {
      toggleButton.remove();
    }
    this.isInitialized = false;
    delete window.__calEmbedTroubleshooter;
  }
}
