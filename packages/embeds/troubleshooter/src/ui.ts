import type { ConsoleError, NetworkLogEntry } from "./types";

export function getUITemplate(): string {
  return `
    <div id="cal-troubleshooter-header">
      <span>Cal.com Embed Troubleshooter</span>
      <button id="cal-troubleshooter-close">&times;</button>
    </div>
    <div id="cal-troubleshooter-tabs">
      <button class="cal-tab active" data-tab="diagnostics">Diagnostics</button>
      <button class="cal-tab" data-tab="console">Console</button>
      <button class="cal-tab" data-tab="network">Network</button>
    </div>
    <div id="cal-troubleshooter-content">
      <div class="cal-tab-content active" id="tab-diagnostics">
        <div class="cal-loading">Running diagnostics...</div>
      </div>
      <div class="cal-tab-content" id="tab-console">
        <div class="cal-empty-state">No Cal.com related console errors detected</div>
      </div>
      <div class="cal-tab-content" id="tab-network">
        <div class="cal-empty-state">No Cal.com network requests detected</div>
      </div>
    </div>
  `;
}

export function updateConsoleTab(container: HTMLElement, consoleErrors: ConsoleError[]): void {
  if (consoleErrors.length === 0) {
    container.innerHTML = '<div class="cal-empty-state">No Cal.com related console errors detected</div>';
    return;
  }

  container.innerHTML = consoleErrors
    .map(
      (error) => `
      <div class="cal-error-log">
        <div class="cal-error-time">${error.timestamp.toLocaleTimeString()}</div>
        <div class="cal-error-message">${escapeHtml(error.message)}</div>
      </div>
    `
    )
    .join("");
}

export function updateNetworkTab(container: HTMLElement, networkLog: NetworkLogEntry[]): void {
  if (networkLog.length === 0) {
    container.innerHTML = '<div class="cal-empty-state">No Cal.com network requests detected</div>';
    return;
  }

  container.innerHTML = networkLog
    .map(
      (entry) => `
      <div class="cal-network-entry">
        <div class="cal-network-url">
          <a href="${escapeHtml(
            entry.url
          )}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none; hover:text-decoration: underline;">
            ${escapeHtml(entry.url)}
          </a>
        </div>
        <div>
          <span style="color: #3b82f6; font-weight: 500; margin-right: 8px;">${entry.type || "Unknown"}</span>
          <span>${entry.method}</span>
          <span class="cal-network-status ${entry.error ? "error" : "success"}">
            ${entry.error || entry.status}
          </span>
          <span style="color: #6b7280; margin-left: 8px;">${entry.duration}ms</span>
        </div>
      </div>
    `
    )
    .join("");
}

export function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
