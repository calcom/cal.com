"use client";

import * as React from "react";

import classNames from "@calcom/ui/classNames";

interface RenderInfo {
  componentName: string;
  renderCount: number;
  lastRenderTime: number;
}

interface DevProfilerContextValue {
  registerRender: (componentName: string) => void;
  getRenderInfo: () => RenderInfo[];
}

const DevProfilerContext = React.createContext<DevProfilerContextValue | null>(null);

function useDevProfilerContext() {
  return React.useContext(DevProfilerContext);
}

export function useRenderCount(componentName: string) {
  const context = useDevProfilerContext();
  const hasRegistered = React.useRef(false);

  React.useEffect(() => {
    if (context && !hasRegistered.current) {
      hasRegistered.current = true;
    }
  }, [context]);

  React.useEffect(() => {
    if (context) {
      context.registerRender(componentName);
    }
  });
}

interface DevProfilerProps {
  children: React.ReactNode;
}

function DevProfilerPanel({
  isOpen,
  onClose,
  renderInfo,
}: {
  isOpen: boolean;
  onClose: () => void;
  renderInfo: RenderInfo[];
}) {
  if (!isOpen) return null;

  const sortedInfo = [...renderInfo].sort((a, b) => b.renderCount - a.renderCount);
  const totalRenders = renderInfo.reduce((sum, info) => sum + info.renderCount, 0);

  return (
    <div
      className={classNames(
        "bg-default fixed bottom-16 right-4 z-[9999] w-80 rounded-lg border shadow-lg",
        "max-h-96 overflow-hidden"
      )}>
      <div className="border-subtle flex items-center justify-between border-b p-3">
        <h3 className="text-emphasis text-sm font-semibold">Dev Profiler</h3>
        <button
          onClick={onClose}
          className="text-subtle hover:text-emphasis rounded p-1 text-xs transition-colors"
          aria-label="Close panel">
          Close
        </button>
      </div>
      <div className="p-3">
        <div className="text-subtle mb-3 text-xs">
          <span className="text-emphasis font-medium">{renderInfo.length}</span> tracked components |{" "}
          <span className="text-emphasis font-medium">{totalRenders}</span> total renders
        </div>
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {sortedInfo.length === 0 ? (
            <p className="text-subtle text-xs">
              No components tracked yet. Use <code className="bg-subtle rounded px-1">useRenderCount</code>{" "}
              hook to track components.
            </p>
          ) : (
            sortedInfo.map((info) => (
              <div
                key={info.componentName}
                className="bg-subtle flex items-center justify-between rounded p-2 text-xs">
                <span className="text-emphasis truncate font-medium">{info.componentName}</span>
                <span
                  className={classNames(
                    "ml-2 shrink-0 rounded px-2 py-0.5 font-mono",
                    info.renderCount > 10
                      ? "bg-error text-error"
                      : info.renderCount > 5
                        ? "bg-attention text-attention"
                        : "bg-success text-success"
                  )}>
                  {info.renderCount}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function DevProfilerBadge({
  onClick,
  totalRenders,
}: {
  onClick: () => void;
  totalRenders: number;
}) {
  return (
    <button
      onClick={onClick}
      className={classNames(
        "fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-lg px-3 py-2 shadow-lg transition-all",
        "bg-inverted text-inverted hover:opacity-90",
        "text-xs font-medium"
      )}
      aria-label="Open Dev Profiler">
      <span className="flex h-2 w-2">
        <span className="bg-success absolute inline-flex h-2 w-2 animate-ping rounded-full opacity-75" />
        <span className="bg-success relative inline-flex h-2 w-2 rounded-full" />
      </span>
      <span>Renders: {totalRenders}</span>
    </button>
  );
}

function DevProfilerInner({ children }: DevProfilerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const renderInfoRef = React.useRef<Map<string, RenderInfo>>(new Map());
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  const registerRender = React.useCallback((componentName: string) => {
    const existing = renderInfoRef.current.get(componentName);
    if (existing) {
      existing.renderCount += 1;
      existing.lastRenderTime = Date.now();
    } else {
      renderInfoRef.current.set(componentName, {
        componentName,
        renderCount: 1,
        lastRenderTime: Date.now(),
      });
    }
    forceUpdate();
  }, []);

  const getRenderInfo = React.useCallback(() => {
    return Array.from(renderInfoRef.current.values());
  }, []);

  const contextValue = React.useMemo(
    () => ({ registerRender, getRenderInfo }),
    [registerRender, getRenderInfo]
  );

  const totalRenders = React.useMemo(() => {
    return Array.from(renderInfoRef.current.values()).reduce((sum, info) => sum + info.renderCount, 0);
  }, [renderInfoRef.current.size]);

  return (
    <DevProfilerContext.Provider value={contextValue}>
      {children}
      <DevProfilerBadge onClick={() => setIsOpen(true)} totalRenders={totalRenders} />
      <DevProfilerPanel isOpen={isOpen} onClose={() => setIsOpen(false)} renderInfo={getRenderInfo()} />
    </DevProfilerContext.Provider>
  );
}

export function DevProfiler({ children }: DevProfilerProps) {
  if (process.env.NODE_ENV !== "development") {
    return <>{children}</>;
  }

  return <DevProfilerInner>{children}</DevProfilerInner>;
}
