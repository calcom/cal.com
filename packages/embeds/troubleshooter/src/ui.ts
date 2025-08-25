import type { ConsoleError, NetworkLogEntry, NetworkLogGroup } from "./types";
import { getGroupedNetworkEntries } from "./interceptors";

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
        <div class="cal-error-time">
          ${error.timestamp.toLocaleTimeString()}
          ${error.context ? `<span style="color: #6b7280; margin-left: 8px;">[${error.context}]</span>` : ''}
        </div>
        <div class="cal-error-message">${escapeHtml(error.message)}</div>
      </div>
    `
    )
    .join("");
}

export function updateNetworkTab(container: HTMLElement, networkLog: NetworkLogEntry[]): void {
  const groupedEntries = getGroupedNetworkEntries();
  
  if (groupedEntries.size === 0) {
    container.innerHTML = '<div class="cal-empty-state">No Cal.com network requests detected</div>';
    return;
  }

  let html = '';
  
  // Sort contexts: webpage first, then iframes
  const sortedContexts = Array.from(groupedEntries.keys()).sort((a, b) => {
    if (a === 'webpage') return -1;
    if (b === 'webpage') return 1;
    return a.localeCompare(b);
  });
  
  sortedContexts.forEach((context) => {
    const entries = groupedEntries.get(context) || [];
    const contextId = context.replace(/[^a-z0-9]/gi, '-');
    
    html += `
      <div class="cal-network-context-group" style="margin-bottom: 16px;">
        <div class="cal-network-context-header" 
             onclick="window.__calEmbedTroubleshooter.toggleNetworkSection('${contextId}')"
             style="background: #f3f4f6; padding: 8px 12px; cursor: pointer; border-radius: 4px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 500; text-transform: capitalize;">${context}</span>
          <span style="color: #6b7280; font-size: 12px;">${entries.length} request${entries.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="cal-network-context-body" id="network-section-${contextId}" style="display: block;">
          ${entries.map(entry => `
            <div class="cal-network-entry" style="padding-left: 12px;">
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
          `).join('')}
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

export function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
