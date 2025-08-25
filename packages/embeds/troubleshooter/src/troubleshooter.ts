import { getAllAccessibleContexts } from "./context-utils";
import { runGroupedDiagnostics } from "./diagnostics";
import { setupConsoleInterception, getNetworkEntriesFromPerformance } from "./interceptors";
import { styles } from "./styles";
import type {
  ConsoleError,
  NetworkLogEntry,
  DiagnosticResults,
  DiagnosticCheck,
  GroupedDiagnosticResults,
} from "./types";
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
  private expandedNetworkSections: Set<string> = new Set(["webpage"]);
  private expandedDiagnosticContexts: Set<string> = new Set(["webpage", "all"]);
  private previousDiagnosticsHash = "";
  private lastDiagnosticsResults: GroupedDiagnosticResults[] | null = null;

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

    // Setup interception in all accessible contexts
    this.setupAllContextInterception();

    this.startNetworkPolling();
    this.startDiagnosticsPolling();
    this.createUI();
    this.runDiagnostics();
    this.updateConsoleTabIndicator();
    this.updateNetworkTabIndicator();
    this.show();
  }

  private setupAllContextInterception(): void {
    // Setup for main window
    this.setupConsoleInterception();

    // Try to setup for accessible iframes
    const contexts = getAllAccessibleContexts();
    contexts.forEach((context) => {
      if (context.window && context.window !== window) {
        try {
          // Setup console interception in iframe context
          const iframeConsole = context.window.console;
          const originalError = iframeConsole.error;
          const consoleErrors = this.consoleErrors;
          const contextLabel = context.label;

          iframeConsole.error = function (...args: any[]) {
            const errorString = args
              .map((arg: any) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
              .join(" ");

            if (errorString.toLowerCase().includes("cal") || errorString.toLowerCase().includes("embed")) {
              consoleErrors.push({
                timestamp: new Date(),
                message: errorString,
                stack: new Error().stack,
                context: contextLabel,
              });
            }

            originalError.apply(iframeConsole, args);
          };
        } catch (e) {
          // Unable to setup interception in this context
        }
      }
    });
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
    toggleButton.innerHTML = "Cal";
    toggleButton.title = "Cal.com Embed Troubleshooter - Click to open";
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

    const existingIndicator = consoleTab.querySelector(".cal-tab-indicator") as HTMLElement;
    const errorCount = this.consoleErrors.length;

    // No errors and no indicator - nothing to do
    if (errorCount === 0 && !existingIndicator) {
      return;
    }

    // No errors but indicator exists - remove it
    if (errorCount === 0 && existingIndicator) {
      existingIndicator.remove();
      return;
    }

    // Check if indicator exists with correct count
    if (existingIndicator && existingIndicator.textContent === errorCount.toString()) {
      return; // No change needed
    }

    // Remove old indicator if it exists
    if (existingIndicator) {
      existingIndicator.remove();
    }

    // Add new indicator
    const indicator = document.createElement("span");
    indicator.className = "cal-tab-indicator";
    indicator.textContent = errorCount.toString();
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

  private updateNetworkTabIndicator(): void {
    const networkTab = document.querySelector('.cal-tab[data-tab="network"]');
    if (!networkTab) return;

    const existingIndicator = networkTab.querySelector(".cal-tab-indicator") as HTMLElement;
    const failedRequests = this.networkLog.filter((req) => req.error || (req.status && req.status >= 400));
    const failedCount = failedRequests.length;

    // No failures and no indicator - nothing to do
    if (failedCount === 0 && !existingIndicator) {
      return;
    }

    // No failures but indicator exists - remove it
    if (failedCount === 0 && existingIndicator) {
      existingIndicator.remove();
      return;
    }

    // Check if indicator exists with correct count
    if (existingIndicator && existingIndicator.textContent === failedCount.toString()) {
      return; // No change needed
    }

    // Remove old indicator if it exists
    if (existingIndicator) {
      existingIndicator.remove();
    }

    // Add new indicator
    const indicator = document.createElement("span");
    indicator.className = "cal-tab-indicator";
    indicator.textContent = failedCount.toString();
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

  private async runDiagnostics(): Promise<void> {
    this.getNetworkEntries();
    const groupedDiagnostics = await runGroupedDiagnostics(this.consoleErrors, this.networkLog);

    // Generate a hash to detect changes
    const currentHash = this.generateDiagnosticsHash(groupedDiagnostics);

    // Only update DOM if diagnostics have changed
    if (currentHash !== this.previousDiagnosticsHash) {
      this.previousDiagnosticsHash = currentHash;
      this.lastDiagnosticsResults = groupedDiagnostics;
      this.displayGroupedResults(groupedDiagnostics);
    }

    // Always update tab indicators (they're lightweight)
    let hasErrors = false;
    let hasWarnings = false;

    groupedDiagnostics.forEach((group) => {
      Object.values(group.diagnostics).forEach((section) => {
        if (section.status === "error") hasErrors = true;
        if (section.status === "warning") hasWarnings = true;
      });
    });

    this.updateTabIndicatorsFromStatus(hasErrors, hasWarnings);
  }

  private generateDiagnosticsHash(groups: GroupedDiagnosticResults[]): string {
    // Create a stable string representation of the diagnostic results
    // We only care about the actual diagnostic data, not UI state
    const relevantData = groups.map((group) => ({
      context: group.context,
      selector: group.selector,
      sections: Object.entries(group.diagnostics).map(([key, section]) => ({
        key,
        title: section.title,
        status: section.status,
        checks: section.checks.map((check) => ({
          status: check.status,
          text: check.text,
          details: check.details,
        })),
      })),
    }));

    // Simple hash using JSON stringify
    // For production, consider using a proper hash function
    return JSON.stringify(relevantData);
  }

  private updateTabIndicatorsFromStatus(hasErrors: boolean, hasWarnings: boolean): void {
    const diagnosticsTab = document.querySelector('.cal-tab[data-tab="diagnostics"]');
    if (!diagnosticsTab) return;

    const existingIndicator = diagnosticsTab.querySelector(".cal-tab-indicator") as HTMLElement;
    const needsIndicator = hasErrors || hasWarnings;

    // Check if current state matches desired state
    if (!needsIndicator && !existingIndicator) {
      return; // No indicator needed and none exists
    }

    if (!needsIndicator && existingIndicator) {
      existingIndicator.remove(); // Remove unneeded indicator
      return;
    }

    const expectedBackground = hasErrors ? "#dc2626" : "#f59e0b";

    // If indicator exists and has correct color, do nothing
    if (existingIndicator && existingIndicator.style.background === expectedBackground) {
      return;
    }

    // Remove old indicator if it exists
    if (existingIndicator) {
      existingIndicator.remove();
    }

    // Add new indicator
    const indicator = document.createElement("span");
    indicator.className = "cal-tab-indicator";
    indicator.textContent = "!";
    indicator.style.cssText = `
      background: ${expectedBackground};
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

  private updateTabIndicators(diagnostics: DiagnosticResults): void {
    const diagnosticsTab = document.querySelector('.cal-tab[data-tab="diagnostics"]');
    if (!diagnosticsTab) return;

    // Check if there are any errors or warnings
    const hasErrors = Object.values(diagnostics).some((d) => d.status === "error");
    const hasWarnings = Object.values(diagnostics).some((d) => d.status === "warning");

    // Remove existing indicators
    const existingIndicator = diagnosticsTab.querySelector(".cal-tab-indicator");
    if (existingIndicator) {
      existingIndicator.remove();
    }

    // Add new indicator if needed
    if (hasErrors || hasWarnings) {
      const indicator = document.createElement("span");
      indicator.className = "cal-tab-indicator";
      indicator.textContent = hasErrors ? "!" : "!";
      indicator.style.cssText = `
        background: ${hasErrors ? "#dc2626" : "#f59e0b"};
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

  private displayGroupedResults(groups: GroupedDiagnosticResults[]): void {
    const content = document.getElementById("tab-diagnostics");
    if (!content) return;

    // Preserve expanded state before any DOM changes
    this.preserveExpandedState(content);

    let html = "";

    // Generate overall summary
    const summary = this.generateOverallSummary(groups);
    if (summary) {
      html += summary;
    }

    // If only one group, display without context header
    if (groups.length === 1) {
      const contextId = groups[0].context.replace(/[^a-z0-9]/gi, "-");
      html += this.renderDiagnosticSections(groups[0].diagnostics, contextId);
    } else {
      // Display grouped diagnostics with clear visual separation
      groups.forEach((group, index) => {
        const contextId = group.context.replace(/[^a-z0-9]/gi, "-");
        const isExpanded = this.isFirstLoad
          ? group.isExpanded
          : this.expandedDiagnosticContexts.has(contextId);
        const isWebpage = group.context === "webpage";

        html += `
          <div class="cal-context-group" style="
            margin-bottom: 20px;
            border: 1px solid ${isWebpage ? "#e5e7eb" : "#ddd6fe"};
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          ">
            <div class="cal-context-header" 
                 onclick="window.__calEmbedTroubleshooter.toggleDiagnosticContext('${contextId}')"
                 style="
                   background: ${isWebpage ? "#f9fafb" : "#f5f3ff"};
                   padding: 12px 16px;
                   cursor: pointer;
                   display: flex;
                   justify-content: space-between;
                   align-items: center;
                   border-bottom: 1px solid ${isWebpage ? "#e5e7eb" : "#ddd6fe"};
                 ">
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <span style="
                  font-weight: 600;
                  text-transform: capitalize;
                  color: ${isWebpage ? "#111827" : "#4c1d95"};
                ">
                  ${isWebpage ? "[Web]" : "[Frame]"} ${group.context}
                </span>
                ${
                  group.selector
                    ? `
                  <span style="
                    font-size: 11px;
                    color: #6b7280;
                    font-family: monospace;
                  ">
                    ${this.escapeHtml(group.selector)}
                  </span>
                `
                    : ""
                }
              </div>
              <span style="
                font-size: 12px;
                padding: 2px 8px;
                border-radius: 12px;
                background: ${this.getStatusBackgroundColor(group.diagnostics)};
                color: ${this.getStatusTextColor(group.diagnostics)};
              ">
                ${this.getContextStatusSummary(group.diagnostics)}
              </span>
            </div>
            <div class="cal-context-body" id="context-${contextId}" style="
              display: ${isExpanded ? "block" : "none"};
              padding: ${isExpanded ? "12px" : "0"};
              background: white;
            ">
              ${this.renderDiagnosticSections(group.diagnostics, contextId)}
            </div>
          </div>
        `;
      });
    }

    // Add auto-refresh indicator
    html +=
      '<div style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 16px;">Auto-refreshing every second</div>';

    content.innerHTML = html;

    // Restore expanded state
    this.restoreExpandedState();

    if (this.isFirstLoad) {
      this.isFirstLoad = false;
    }
  }

  private preserveExpandedState(content: HTMLElement): void {
    // Only preserve state if not first load
    if (this.isFirstLoad) return;

    // Clear previous state
    this.expandedSections.clear();
    this.expandedDiagnosticContexts.clear();

    // Save expanded diagnostic sections
    const expandedBodies = content.querySelectorAll(".cal-diagnostic-body.active");
    expandedBodies.forEach((body) => {
      const id = body.id.replace("section-", "");
      this.expandedSections.add(id);
    });

    // Save expanded context groups
    const expandedContexts = content.querySelectorAll(".cal-context-body[style*='block']");
    expandedContexts.forEach((body) => {
      const id = body.id.replace("context-", "");
      this.expandedDiagnosticContexts.add(id);
    });
  }

  private restoreExpandedState(): void {
    // Restore section expanded states
    this.expandedSections.forEach((sectionId) => {
      const sectionBody = document.getElementById(`section-${sectionId}`);
      if (sectionBody) {
        sectionBody.classList.add("active");
      }
    });

    // Context expanded states are already handled in the HTML generation
    // via the isExpanded check in displayGroupedResults
  }

  private generateOverallSummary(groups: GroupedDiagnosticResults[]): string {
    const allIssues: Array<{ severity: string; text: string; context: string }> = [];
    let hasCalInIframe = false;
    let hasCalInWebpage = false;

    groups.forEach((group) => {
      // Check if Cal.com is detected in this context
      const embedSection = group.diagnostics.embed;
      if (
        embedSection &&
        embedSection.checks.some(
          (check) => check.text.includes("window.Cal is defined") && check.status === "success"
        )
      ) {
        if (group.context === "webpage") {
          hasCalInWebpage = true;
        } else if (group.context.startsWith("iframe")) {
          hasCalInIframe = true;
        }
      }

      Object.values(group.diagnostics).forEach((section) => {
        // Only count actual errors and warnings, not info items
        if (section.status === "error" || section.status === "warning") {
          section.checks.forEach((check) => {
            if (check.status === "error" || check.status === "warning") {
              allIssues.push({
                severity: check.status,
                text: check.text,
                context: group.context,
              });
            }
          });
        }
      });
    });

    let summaryHtml = "";

    // Show installation location notice if Cal.com is only in iframe
    if (hasCalInIframe && !hasCalInWebpage) {
      summaryHtml += `
        <div class="cal-installation-notice" style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
          <div style="display: flex; align-items: start; gap: 8px;">
            <span style="color: #0369a1; font-weight: bold; font-size: 14px;">[i]</span>
            <div>
              <div style="font-weight: 500; color: #0369a1;">Cal.com detected in iframe</div>
              <div style="color: #0c4a6e; font-size: 13px; margin-top: 2px;">The embed is correctly installed within an iframe context. The webpage itself doesn't have Cal.com installed, which is normal for iframe-based implementations.</div>
            </div>
          </div>
        </div>
      `;
    }

    if (allIssues.length === 0) return summaryHtml;

    const errors = allIssues.filter((i) => i.severity === "error");
    const warnings = allIssues.filter((i) => i.severity === "warning");

    summaryHtml += `
      <div class="cal-overall-summary" style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
        <div style="font-weight: 600; color: #991b1b; margin-bottom: 8px;">Issues Summary</div>
    `;

    if (errors.length > 0) {
      summaryHtml += `
        <div style="margin-bottom: 6px;">
          <span style="color: #dc2626; font-weight: 500;">[X] ${errors.length} Error(s):</span>
          <ul style="margin: 4px 0 0 20px; color: #7f1d1d; font-size: 13px;">
            ${errors
              .slice(0, 3)
              .map(
                (e) =>
                  `<li>${e.text} ${
                    e.context !== "all" && e.context !== "webpage" ? `[${e.context}]` : ""
                  }</li>`
              )
              .join("")}
            ${
              errors.length > 3 ? `<li style="font-style: italic;">...and ${errors.length - 3} more</li>` : ""
            }
          </ul>
        </div>
      `;
    }

    if (warnings.length > 0) {
      summaryHtml += `
        <div>
          <span style="color: #f59e0b; font-weight: 500;">[!] ${warnings.length} Warning(s):</span>
          <ul style="margin: 4px 0 0 20px; color: #92400e; font-size: 13px;">
            ${warnings
              .slice(0, 2)
              .map(
                (w) =>
                  `<li>${w.text} ${
                    w.context !== "all" && w.context !== "webpage" ? `[${w.context}]` : ""
                  }</li>`
              )
              .join("")}
            ${
              warnings.length > 2
                ? `<li style="font-style: italic;">...and ${warnings.length - 2} more</li>`
                : ""
            }
          </ul>
        </div>
      `;
    }

    summaryHtml += "</div>";
    return summaryHtml;
  }

  private getContextStatusSummary(diagnostics: DiagnosticResults): string {
    // Check if Cal.com is not installed (embed section has info status with "not defined in webpage" message)
    const embedSection = diagnostics.embed;
    if (
      embedSection &&
      embedSection.status === "info" &&
      embedSection.checks.some((check) => check.text.includes("not defined in webpage"))
    ) {
      return "Not Installed";
    }

    let errorCount = 0;
    let warningCount = 0;

    Object.values(diagnostics).forEach((section) => {
      if (section.status === "error") errorCount++;
      if (section.status === "warning") warningCount++;
    });

    const parts = [];
    if (errorCount > 0) parts.push(`${errorCount} error${errorCount !== 1 ? "s" : ""}`);
    if (warningCount > 0) parts.push(`${warningCount} warning${warningCount !== 1 ? "s" : ""}`);

    return parts.length > 0 ? parts.join(", ") : "All checks passed";
  }

  private getStatusBackgroundColor(diagnostics: DiagnosticResults): string {
    // Check if Cal.com is not installed
    const embedSection = diagnostics.embed;
    if (
      embedSection &&
      embedSection.status === "info" &&
      embedSection.checks.some((check) => check.text.includes("not defined in webpage"))
    ) {
      return "#e5e7eb"; // Gray for not installed
    }

    const hasError = Object.values(diagnostics).some((section) => section.status === "error");
    const hasWarning = Object.values(diagnostics).some((section) => section.status === "warning");

    if (hasError) return "#fee2e2";
    if (hasWarning) return "#fef3c7";
    return "#d1fae5";
  }

  private getStatusTextColor(diagnostics: DiagnosticResults): string {
    // Check if Cal.com is not installed
    const embedSection = diagnostics.embed;
    if (
      embedSection &&
      embedSection.status === "info" &&
      embedSection.checks.some((check) => check.text.includes("not defined in webpage"))
    ) {
      return "#6b7280"; // Gray text for not installed
    }

    const hasError = Object.values(diagnostics).some((section) => section.status === "error");
    const hasWarning = Object.values(diagnostics).some((section) => section.status === "warning");

    if (hasError) return "#991b1b";
    if (hasWarning) return "#92400e";
    return "#065f46";
  }

  private renderDiagnosticSections(diagnostics: DiagnosticResults, contextId = ""): string {
    let html = "";

    // Sort sections by priority
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
      const baseSectionId = section.title.toLowerCase().replace(/\s+/g, "-");
      const sectionId = contextId ? `${contextId}-${baseSectionId}` : baseSectionId;

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

    return html;
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
    html +=
      '<div style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 16px;">Auto-refreshing every second</div>';

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

  toggleNetworkSection(sectionId: string): void {
    const section = document.getElementById(`network-section-${sectionId}`);
    if (section) {
      const isCurrentlyVisible = section.style.display !== "none";
      section.style.display = isCurrentlyVisible ? "none" : "block";

      // Update our tracking of expanded network sections
      if (!isCurrentlyVisible) {
        this.expandedNetworkSections.add(sectionId);
      } else {
        this.expandedNetworkSections.delete(sectionId);
      }
    }
  }

  toggleDiagnosticContext(contextId: string): void {
    const section = document.getElementById(`context-${contextId}`);
    if (section) {
      const isCurrentlyVisible = section.style.display !== "none";
      section.style.display = isCurrentlyVisible ? "none" : "block";

      // Update our tracking of expanded diagnostic contexts
      if (!isCurrentlyVisible) {
        this.expandedDiagnosticContexts.add(contextId);
      } else {
        this.expandedDiagnosticContexts.delete(contextId);
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

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
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
