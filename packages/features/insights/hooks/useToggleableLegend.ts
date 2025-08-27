import { useState, useMemo } from "react";

export const useToggleableLegend = <T extends { label: string }>(legend: T[], initialEnabled?: string[]) => {
  const [enabledSeries, setEnabledSeries] = useState<string[]>(
    initialEnabled ?? legend.map((item) => item.label)
  );

  const enabledLegend = useMemo(
    () => legend.filter((item) => enabledSeries.includes(item.label)),
    [legend, enabledSeries]
  );

  const toggleSeries = (label: string) => {
    const newEnabledSeries = enabledSeries.includes(label)
      ? enabledSeries.filter((s) => s !== label)
      : [...enabledSeries, label];
    setEnabledSeries(newEnabledSeries);
  };

  return {
    enabledLegend,
    toggleSeries,
  };
};
