import type { LineChartProps } from "@tremor/react";
import { LineChart as ExternalLineChart } from "@tremor/react";
import { useEffect, useRef } from "react";

export const LineChart = (props: LineChartProps) => {
  const chartContainerRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current) {
      return;
    }

    const observer = new MutationObserver(() => {
      const textElements = chartContainerRef.current.querySelectorAll(
        ".tremor-Card-root .recharts-yAxis text"
      );

      for (let i = 0; i < textElements.length; i++) {
        textElements[i].setAttribute("fill", "var(--cal-text-emphasis)");
      }
    });

    observer.observe(chartContainerRef.current, { childList: true, subtree: true });

    // Clean up the observer when the component is unmounted
    return () => observer.disconnect();
  }, [chartContainerRef]);

  return <ExternalLineChart ref={chartContainerRef} {...props} />;
};
