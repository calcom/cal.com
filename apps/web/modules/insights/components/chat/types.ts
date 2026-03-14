export type ChartType = "line" | "bar" | "pie" | "area";

export interface ChatChartResult {
  id: string;
  query: string;
  chartType: ChartType;
  title: string;
  description: string;
  endpoint: string;
  dataKeys: string[];
  xAxisKey: string;
  colors: string[];
  data: Record<string, unknown>[];
  savedAt?: number;
}
