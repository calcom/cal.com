"use client";

import { useCallback, useState } from "react";

import { registry } from "@calcom/features/admin-dataview/registry";

import { useStudio } from "../contexts/StudioContext";
import { RecordDetailModal } from "./RecordDetailModal";
import { ResizeHandle } from "./ResizeHandle";
import { SqlQueryPanel } from "./SqlQueryPanel";
import { StudioSidebar } from "./StudioSidebar";
import { StudioTable } from "./StudioTable";

interface StudioLayoutProps {
  slug: string | null;
}

const SQL_MODE_SLUG = "__sql__";

const SIDEBAR_MIN = 180;
const SIDEBAR_MAX = 320;
const SIDEBAR_DEFAULT = 224; // w-56 = 14rem = 224px

const PANEL_MIN = 360;
const PANEL_MAX = 800;
const PANEL_DEFAULT = 480;

export function StudioLayout({ slug }: StudioLayoutProps) {
  const isSqlMode = slug === SQL_MODE_SLUG;
  const table = slug && !isSqlMode ? registry.getBySlug(slug) ?? null : null;
  const { detail, dialogOpen, pinned, openDetail, pin, unpin, close, setDialogOpen } = useStudio();

  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT);

  const handleOpenDetail = (row: Record<string, unknown>) => {
    if (!table) return;
    openDetail(table.slug, row);
  };

  const handleSidebarResize = useCallback((delta: number) => {
    setSidebarWidth((w) => Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, w + delta)));
  }, []);

  const handlePanelResize = useCallback((delta: number) => {
    setPanelWidth((w) => Math.min(PANEL_MAX, Math.max(PANEL_MIN, w + delta)));
  }, []);

  const showPanel = pinned && detail;

  return (
    <>
      <div
        className="grid h-full w-full overflow-hidden"
        style={{
          gridTemplateColumns: showPanel
            ? `${sidebarWidth}px 6px minmax(0, 1fr) 6px minmax(0, ${panelWidth}px)`
            : `${sidebarWidth}px 6px minmax(0, 1fr)`,
          gridTemplateRows: "minmax(0, 1fr)",
        }}>
        {/* Sidebar */}
        <div className="min-h-0 overflow-hidden">
          <StudioSidebar />
        </div>

        {/* Sidebar resize handle */}
        <ResizeHandle direction="right" onResize={handleSidebarResize} />

        {/* Main table area */}
        <div className="grid overflow-hidden" style={{ gridTemplateRows: "minmax(0, 1fr)" }}>
          {isSqlMode ? (
            <SqlQueryPanel />
          ) : table ? (
            <StudioTable table={table} onOpenDetail={handleOpenDetail} />
          ) : (
            <WelcomeScreen />
          )}
        </div>

        {/* Panel resize handle + pinned panel */}
        {showPanel && (
          <>
            <ResizeHandle direction="left" onResize={handlePanelResize} />
            <RecordDetailModal
              table={detail.table}
              row={detail.row}
              open
              onOpenChange={(open) => {
                if (!open) close();
              }}
              mode="pinned"
              onUnpin={unpin}
            />
          </>
        )}
      </div>

      {/* Dialog mode — outside the grid */}
      {!pinned && detail && (
        <RecordDetailModal
          table={detail.table}
          row={detail.row}
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open) setDialogOpen(false);
          }}
          mode="dialog"
          onPin={pin}
        />
      )}
    </>
  );
}

function WelcomeScreen() {
  return (
    <div className="flex items-center justify-center overflow-hidden">
      <div className="text-center">
        <div className="bg-subtle mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl">
          <svg className="text-muted h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
            />
          </svg>
        </div>
        <h3 className="text-emphasis text-lg font-semibold">Data Studio</h3>
        <p className="text-subtle mt-1 max-w-sm text-sm">
          Select a table from the sidebar to browse records. Click the ↗ icon on any row to view full details
          and relations.
        </p>
      </div>
    </div>
  );
}
