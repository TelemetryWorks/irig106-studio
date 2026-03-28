/**
 * BottomPanel — console output, statistics, time correlation, and error log.
 */

import type { BottomTab, LogEntry } from "@/types/domain";

export function createBottomPanel(container: HTMLElement): {
  addLog(entry: LogEntry): void;
  setActiveTab(tab: BottomTab): void;
} {
  container.classList.add("panel", "bottom-panel");

  const tabs: BottomTab[] = ["console", "statistics", "time-correlation", "errors"];

  container.innerHTML = `
    <div class="resize-handle resize-handle--row top" aria-hidden="true"></div>
    <div class="tab-bar" id="bottom-tabs" role="tablist" aria-label="Bottom panel tabs">
      ${tabs.map((t) => `
        <span class="tab-bar__tab${t === "console" ? " tab-bar__tab--active" : ""}" data-tab="${t}"
              role="tab" aria-selected="${t === "console" ? "true" : "false"}" tabindex="${t === "console" ? "0" : "-1"}">
          ${tabLabel(t)}
        </span>
      `).join("")}
    </div>
    <div class="panel__body" id="bottom-body" role="tabpanel" aria-label="Bottom panel content" style="padding:4px 2px"></div>
  `;

  const tabBar = container.querySelector("#bottom-tabs") as HTMLElement;
  const body = container.querySelector("#bottom-body") as HTMLElement;
  let activeTab: BottomTab = "console";
  const logs: LogEntry[] = [];

  tabBar.addEventListener("click", (e) => {
    const tabEl = (e.target as HTMLElement).closest("[data-tab]") as HTMLElement | null;
    if (!tabEl) return;
    setActiveTab(tabEl.dataset.tab as BottomTab);
  });

  function setActiveTab(tab: BottomTab) {
    activeTab = tab;
    tabBar.querySelectorAll(".tab-bar__tab").forEach((el) => {
      const isActive = (el as HTMLElement).dataset.tab === tab;
      el.classList.toggle("tab-bar__tab--active", isActive);
      el.setAttribute("aria-selected", isActive ? "true" : "false");
      el.setAttribute("tabindex", isActive ? "0" : "-1");
    });
    renderContent();
  }

  function renderContent() {
    switch (activeTab) {
      case "console":
        renderConsole();
        break;
      case "statistics":
        renderStats();
        break;
      case "time-correlation":
        renderTimeCorrelation();
        break;
      case "errors":
        renderErrors();
        break;
    }
  }

  function renderConsole() {
    body.innerHTML = logs
      .map(
        (entry) => `
      <div class="console__line">
        <span class="console__ts">${entry.timestamp}</span>
        <span class="console__level console__level--${entry.level}">[${entry.level.toUpperCase()}]</span>
        <span class="console__msg">${escHtml(entry.message)}</span>
      </div>
    `
      )
      .join("");

    // Auto-scroll to bottom
    body.scrollTop = body.scrollHeight;
  }

  function renderStats() {
    body.innerHTML = `
      <div style="padding:8px;font-size:11px;color:var(--c-text-secondary)">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div>
            <div style="color:var(--c-text-tertiary);font-size:10px;margin-bottom:2px">Total packets</div>
            <div style="font-family:var(--font-mono);font-size:14px;color:var(--c-text-primary)">1,247,832</div>
          </div>
          <div>
            <div style="color:var(--c-text-tertiary);font-size:10px;margin-bottom:2px">File size</div>
            <div style="font-family:var(--font-mono);font-size:14px;color:var(--c-text-primary)">2.4 GB</div>
          </div>
          <div>
            <div style="color:var(--c-text-tertiary);font-size:10px;margin-bottom:2px">Duration</div>
            <div style="font-family:var(--font-mono);font-size:14px;color:var(--c-text-primary)">00:42:15</div>
          </div>
          <div>
            <div style="color:var(--c-text-tertiary);font-size:10px;margin-bottom:2px">CRC errors</div>
            <div style="font-family:var(--font-mono);font-size:14px;color:var(--c-danger)">3</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderTimeCorrelation() {
    body.innerHTML = `
      <div style="padding:8px;font-size:11px;color:var(--c-text-secondary)">
        <div style="font-family:var(--font-mono);font-size:10px;line-height:1.8">
          <div>Time source:  <span style="color:var(--c-text-primary)">Channel 4 (IRIG-B)</span></div>
          <div>Format:       <span style="color:var(--c-text-primary)">Day-of-Year (BCD)</span></div>
          <div>Epoch:        <span style="color:var(--c-text-primary)">2024-03-15</span></div>
          <div>RTC overflow:  <span style="color:var(--c-success)">None detected</span></div>
          <div>Max RTC gap:  <span style="color:var(--c-text-primary)">0.012s (packet 841,293)</span></div>
        </div>
      </div>
    `;
  }

  function renderErrors() {
    const errorLogs = logs.filter((l) => l.level === "warn" || l.level === "error");
    if (errorLogs.length === 0) {
      body.innerHTML = `<div style="padding:16px;text-align:center;color:var(--c-text-tertiary);font-size:11px">No errors detected</div>`;
      return;
    }
    body.innerHTML = errorLogs
      .map(
        (entry) => `
      <div class="console__line">
        <span class="console__ts">${entry.timestamp}</span>
        <span class="console__level console__level--${entry.level}">[${entry.level.toUpperCase()}]</span>
        <span class="console__msg">${escHtml(entry.message)}</span>
      </div>
    `
      )
      .join("");
  }

  function addLog(entry: LogEntry) {
    logs.push(entry);
    if (activeTab === "console") renderConsole();
    if (activeTab === "errors" && (entry.level === "warn" || entry.level === "error")) {
      renderErrors();
    }
  }

  // Initial render
  renderContent();

  return { addLog, setActiveTab };
}

// ── Helpers ──

function tabLabel(tab: BottomTab): string {
  const labels: Record<BottomTab, string> = {
    console: "Console",
    statistics: "Statistics",
    "time-correlation": "Time correlation",
    errors: "Errors",
  };
  return labels[tab];
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
