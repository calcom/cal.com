import { LineChart as ExternalLineChart } from "@tremor/react";

import type { LineChartProps } from "./tremor.types";

// Honestly this is a mess. Why are all chart libraries in existance horrible to theme
export const LineChart = (props: LineChartProps) => {
  return <ExternalLineChart {...props} />;
};
