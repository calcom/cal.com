"use client";

import * as React from "react";

import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import {
  Popover,
  PopoverClose,
  PopoverPopup,
  PopoverTitle,
  PopoverTrigger,
} from "@coss/ui/components/popover";
import { ScrollArea } from "@coss/ui/components/scroll-area";

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

function getRenderCountVariant(count: number): "success" | "warning" | "error" {
  if (count > 10) return "error";
  if (count > 5) return "warning";
  return "success";
}

function DevProfilerContent({ renderInfo }: { renderInfo: RenderInfo[] }) {
  const sortedInfo = [...renderInfo].sort((a, b) => b.renderCount - a.renderCount);
  const totalRenders = renderInfo.reduce((sum, info) => sum + info.renderCount, 0);

  return (
    <div className="w-80">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <PopoverTitle>Dev Profiler</PopoverTitle>
        <PopoverClose>
          <Button variant="ghost" size="xs">
            Close
          </Button>
        </PopoverClose>
      </div>
      <div className="pt-3">
        <div className="mb-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{renderInfo.length}</span> tracked components |{" "}
          <span className="font-medium text-foreground">{totalRenders}</span> total renders
        </div>
        <ScrollArea className="max-h-64">
          <div className="space-y-2 pr-2">
            {sortedInfo.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No components tracked yet. Use <code className="rounded bg-muted px-1">useRenderCount</code>{" "}
                hook to track components.
              </p>
            ) : (
              sortedInfo.map((info) => (
                <div
                  key={info.componentName}
                  className="flex items-center justify-between rounded bg-muted p-2 text-xs">
                  <span className="truncate font-medium text-foreground">{info.componentName}</span>
                  <Badge
                    variant={getRenderCountVariant(info.renderCount)}
                    size="sm"
                    className="ml-2 shrink-0 font-mono tabular-nums">
                    {info.renderCount}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function DevProfilerInner({ children }: DevProfilerProps) {
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
      <div className="fixed bottom-4 right-4 z-[9999]">
        <Popover>
          <PopoverTrigger>
            <Button variant="default" size="sm" className="shadow-lg">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              <span>Renders: {totalRenders}</span>
            </Button>
          </PopoverTrigger>
          <PopoverPopup side="top" align="end" sideOffset={8}>
            <DevProfilerContent renderInfo={getRenderInfo()} />
          </PopoverPopup>
        </Popover>
      </div>
    </DevProfilerContext.Provider>
  );
}

export function DevProfiler({ children }: DevProfilerProps) {
  if (process.env.NODE_ENV !== "development") {
    return <>{children}</>;
  }

  return <DevProfilerInner>{children}</DevProfilerInner>;
}
