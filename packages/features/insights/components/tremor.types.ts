type ValueFormatter = {
  (value: number): string;
};

type Color =
  | "slate"
  | "gray"
  | "zinc"
  | "neutral"
  | "stone"
  | "red"
  | "orange"
  | "amber"
  | "yellow"
  | "lime"
  | "green"
  | "emerald"
  | "teal"
  | "cyan"
  | "sky"
  | "blue"
  | "indigo"
  | "violet"
  | "purple"
  | "fuchsia"
  | "pink"
  | "rose";

interface BaseChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data: any[];
  categories: string[];
  index: string;
  colors?: Color[];
  valueFormatter?: ValueFormatter;
  startEndOnly?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  yAxisWidth?: number;
  showAnimation?: boolean;
  showTooltip?: boolean;
  showGradient?: boolean;
  showLegend?: boolean;
  showGridLines?: boolean;
  autoMinValue?: boolean;
  minValue?: number;
  maxValue?: number;
}

export type LineChartProps = BaseChartProps & React.RefAttributes<HTMLDivElement>;
