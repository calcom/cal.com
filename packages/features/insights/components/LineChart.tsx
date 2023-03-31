import type { LineChartProps } from "@tremor/react";
import { LineChart as ExternalLineChart } from "@tremor/react";

// Honestly this is a mess. Why are all chart libraries in existance horrible to theme
export const LineChart = (props: LineChartProps) => {
  return (
    <div className="dark:invert">
      <ExternalLineChart {...props} />
    </div>
  );
};
