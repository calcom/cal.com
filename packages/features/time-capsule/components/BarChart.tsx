import { BarChart as ExternalBarChart } from "@tremor/react";

import type { BarChartProps } from "./tremor.types";

// Honestly this is a mess. Why are all chart libraries in existance horrible to theme
export const BarChart = (props: BarChartProps) => {
  return <ExternalBarChart {...props} />;
};
