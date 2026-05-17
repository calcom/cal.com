import { useCallback, useMemo, useState } from "react";

export const useToggleableLegend = <T extends { label: string }>(legend: T[], initialEnabled?: string[]) => {
  const [enabledSeries, setEnabledSeries] = useState<string[]>(
    initialEnabled ?? legend.map((item) => item.label)
  );

  const enabledLegend = useMemo(
    () => legend.filter((item) => enabledSeries.includes(item.label)),
    [legend, enabledSeries]
  );

  const toggleSeries = useCallback(
    (label: string) => {
      setEnabledSeries((prev) => (prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]));
    },
    [setEnabledSeries]
  );

  return {
    enabledLegend,
    toggleSeries,
  };
};
