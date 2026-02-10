import { useWidgetSync } from "@/hooks/useWidgetSync";

export function WidgetSyncProvider({ children }: { children: React.ReactNode }) {
  useWidgetSync();
  return <>{children}</>;
}
