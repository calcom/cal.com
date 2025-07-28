export const styles = `
  #cal-troubleshooter {
    position: fixed;
    top: 20px;
    right: 20px;
    width: 450px;
    max-height: 90vh;
    background: white;
    border: 2px solid #374151;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #1f2937;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  
  #cal-troubleshooter-toggle {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    background: #111827;
    color: white;
    border: 2px solid #374151;
    border-radius: 50%;
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 2147483646; /* One less than troubleshooter to ensure proper stacking */
    transition: all 0.2s ease;
  }
  
  #cal-troubleshooter-toggle:hover {
    background: #1f2937;
    transform: scale(1.1);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }
  
  #cal-troubleshooter-toggle:active {
    transform: scale(0.95);
  }
  
  #cal-troubleshooter * {
    box-sizing: border-box;
  }
  
  #cal-troubleshooter-header {
    background: #111827;
    color: white;
    padding: 14px 16px;
    font-weight: 600;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #374151;
  }
  
  #cal-troubleshooter-close {
    background: none;
    border: none;
    color: white;
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.2s;
  }
  
  #cal-troubleshooter-close:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  #cal-troubleshooter-tabs {
    display: flex;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .cal-tab {
    flex: 1;
    padding: 10px 16px;
    background: none;
    border: none;
    font-weight: 500;
    color: #6b7280;
    cursor: pointer;
    position: relative;
    transition: color 0.2s;
  }
  
  .cal-tab:hover {
    color: #374151;
  }
  
  .cal-tab.active {
    color: #111827;
  }
  
  .cal-tab.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background: #3b82f6;
  }
  
  #cal-troubleshooter-content {
    padding: 16px;
    overflow-y: auto;
    flex: 1;
    background: white;
  }
  
  .cal-tab-content {
    display: none;
  }
  
  .cal-tab-content.active {
    display: block;
  }
  
  .cal-diagnostic-section {
    margin-bottom: 16px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    overflow: hidden;
  }
  
  .cal-diagnostic-header {
    background: #f9fafb;
    padding: 12px 14px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    user-select: none;
    transition: background 0.2s;
  }
  
  .cal-diagnostic-header:hover {
    background: #f3f4f6;
  }
  
  .cal-diagnostic-status {
    font-size: 12px;
    padding: 3px 10px;
    border-radius: 12px;
    font-weight: 500;
  }
  
  .cal-status-success {
    background: #d1fae5;
    color: #065f46;
  }
  
  .cal-status-error {
    background: #fee2e2;
    color: #991b1b;
  }
  
  .cal-status-warning {
    background: #fef3c7;
    color: #92400e;
  }
  
  .cal-status-info {
    background: #dbeafe;
    color: #1e40af;
  }
  
  .cal-diagnostic-body {
    padding: 14px;
    background: white;
    display: none;
  }
  
  .cal-diagnostic-body.active {
    display: block;
  }
  
  .cal-diagnostic-item {
    margin-bottom: 10px;
    display: flex;
    align-items: flex-start;
  }
  
  .cal-diagnostic-item:last-child {
    margin-bottom: 0;
  }
  
  .cal-diagnostic-icon {
    margin-right: 10px;
    flex-shrink: 0;
    margin-top: 2px;
    font-size: 16px;
  }
  
  .cal-diagnostic-details {
    flex: 1;
  }
  
  .cal-code {
    background: #f3f4f6;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'SF Mono', Monaco, 'Courier New', monospace;
    font-size: 12px;
    word-break: break-all;
  }
  
  .cal-button {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.2s;
  }
  
  .cal-button:hover {
    background: #2563eb;
  }
  
  .cal-button-secondary {
    background: #6b7280;
  }
  
  .cal-button-secondary:hover {
    background: #4b5563;
  }
  
  .cal-refresh-btn {
    margin-top: 12px;
    width: 100%;
  }
  
  .cal-loading {
    text-align: center;
    padding: 40px;
    color: #6b7280;
  }
  
  .cal-error-log {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 12px;
    font-size: 13px;
  }
  
  .cal-error-time {
    color: #991b1b;
    font-weight: 600;
    margin-bottom: 4px;
  }
  
  .cal-error-message {
    color: #7f1d1d;
    font-family: 'SF Mono', Monaco, 'Courier New', monospace;
    font-size: 12px;
    word-break: break-word;
  }
  
  .cal-network-entry {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid #e5e7eb;
    font-size: 13px;
  }
  
  .cal-network-entry:last-child {
    border-bottom: none;
  }
  
  .cal-network-entry:hover {
    background: #f9fafb;
  }
  
  .cal-network-url {
    flex: 1;
    color: #3b82f6;
    word-break: break-word;
    margin-right: 10px;
  }
  
  .cal-network-url a {
    color: inherit;
    text-decoration: none;
  }
  
  .cal-network-url a:hover {
    text-decoration: underline;
  }
  
  .cal-network-status {
    font-weight: 600;
    margin-left: 10px;
  }
  
  .cal-network-status.success {
    color: #059669;
  }
  
  .cal-network-status.error {
    color: #dc2626;
  }
  
  .cal-empty-state {
    text-align: center;
    padding: 40px;
    color: #9ca3af;
  }
  
  .cal-recommendation {
    background: #eff6ff;
    border: 1px solid #dbeafe;
    border-radius: 6px;
    padding: 12px;
    margin-top: 12px;
  }
  
  .cal-recommendation-title {
    font-weight: 600;
    color: #1e40af;
    margin-bottom: 4px;
  }
  
  .cal-recommendation-text {
    color: #3730a3;
    font-size: 13px;
  }
  
  .cal-recommendation-text a {
    color: #2563eb;
    text-decoration: none;
  }
  
  .cal-recommendation-text a:hover {
    text-decoration: underline;
  }
`;
