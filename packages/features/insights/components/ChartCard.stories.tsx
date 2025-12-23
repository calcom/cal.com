import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { ChartCard, ChartCardItem } from "./ChartCard";

const meta = {
  component: ChartCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    title: {
      description: "Title of the chart card",
      control: { type: "text" },
    },
    legend: {
      description: "Array of legend items with label and color",
      control: { type: "object" },
    },
    legendSize: {
      description: "Size of the legend items",
      control: { type: "select" },
      options: ["sm", "default"],
    },
    enabledLegend: {
      description: "Array of enabled legend items for toggling",
      control: { type: "object" },
    },
    onSeriesToggle: {
      description: "Callback when a legend item is toggled",
      action: "series toggled",
    },
    isPending: {
      description: "Loading state",
      control: { type: "boolean" },
    },
    isError: {
      description: "Error state",
      control: { type: "boolean" },
    },
    children: {
      description: "Chart content or other child components",
      control: false,
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[800px] max-w-[90vw]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ChartCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sample data for charts
const sampleChartData = [
  { month: "Jan", created: 65, completed: 45, cancelled: 10 },
  { month: "Feb", created: 72, completed: 58, cancelled: 8 },
  { month: "Mar", created: 88, completed: 70, cancelled: 12 },
  { month: "Apr", created: 95, completed: 82, cancelled: 9 },
  { month: "May", created: 105, completed: 88, cancelled: 11 },
  { month: "Jun", created: 118, completed: 95, cancelled: 15 },
];

const sampleLegend = [
  { label: "Created", color: "#a855f7" },
  { label: "Completed", color: "#22c55e" },
  { label: "Cancelled", color: "#ef4444" },
];

const extendedLegend = [
  { label: "Created", color: "#a855f7" },
  { label: "Completed", color: "#22c55e" },
  { label: "Rescheduled", color: "#3b82f6" },
  { label: "Cancelled", color: "#ef4444" },
  { label: "No-Show (Host)", color: "#64748b" },
  { label: "No-Show (Guest)", color: "#f97316" },
];

// Simple chart component for stories
const SimpleLineChart = ({ data }: { data: typeof sampleChartData }) => (
  <div className="ml-4 mt-4 h-80 sm:ml-0">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 30, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" className="text-xs" axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} className="text-xs opacity-50" axisLine={false} tickLine={false} />
        <Tooltip />
        <Line
          type="linear"
          dataKey="created"
          stroke="#a855f7"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="linear"
          dataKey="completed"
          stroke="#22c55e"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="linear"
          dataKey="cancelled"
          stroke="#ef4444"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

export const Default: Story = {
  args: {
    title: "Event Trends",
    legend: sampleLegend,
    children: <SimpleLineChart data={sampleChartData} />,
  },
};

export const WithLegend: Story = {
  args: {
    title: "Bookings Overview",
    legend: sampleLegend,
    children: <SimpleLineChart data={sampleChartData} />,
  },
};

export const WithExtendedLegend: Story = {
  args: {
    title: "Detailed Event Trends",
    legend: extendedLegend,
    children: (
      <div className="ml-4 mt-4 h-80 sm:ml-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sampleChartData} margin={{ top: 30, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" className="text-xs" axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} className="text-xs opacity-50" axisLine={false} tickLine={false} />
            <Tooltip />
            <Line type="linear" dataKey="created" stroke="#a855f7" strokeWidth={2} />
            <Line type="linear" dataKey="completed" stroke="#22c55e" strokeWidth={2} />
            <Line type="linear" dataKey="cancelled" stroke="#ef4444" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    ),
  },
};

export const WithSmallLegend: Story = {
  args: {
    title: "Event Trends (Compact Legend)",
    legend: extendedLegend,
    legendSize: "sm",
    children: <SimpleLineChart data={sampleChartData} />,
  },
};

export const WithHeaderContent: Story = {
  args: {
    title: "Event Trends",
    legend: sampleLegend,
    headerContent: (
      <div className="flex items-center gap-2">
        <span className="text-subtle text-sm">Last 30 days</span>
      </div>
    ),
    children: <SimpleLineChart data={sampleChartData} />,
  },
};

export const LoadingState: Story = {
  args: {
    title: "Event Trends",
    legend: sampleLegend,
    isPending: true,
  },
};

export const LoadingWithContent: Story = {
  args: {
    title: "Event Trends",
    legend: sampleLegend,
    isPending: true,
    children: <SimpleLineChart data={sampleChartData} />,
  },
};

export const ErrorState: Story = {
  args: {
    title: "Event Trends",
    legend: sampleLegend,
    isError: true,
    children: (
      <div className="m-auto flex h-80 flex-col items-center justify-center">
        <p className="text-error text-sm">Failed to load chart data</p>
      </div>
    ),
  },
};

export const WithListItems: Story = {
  args: {
    title: "Top Event Types",
    children: (
      <div>
        <ChartCardItem count={142}>30 Minute Meeting</ChartCardItem>
        <ChartCardItem count={98}>Discovery Call</ChartCardItem>
        <ChartCardItem count={76}>Team Sync</ChartCardItem>
        <ChartCardItem count={54}>Sales Demo</ChartCardItem>
        <ChartCardItem count={32}>Technical Interview</ChartCardItem>
      </div>
    ),
  },
};

export const WithListItemsNoCount: Story = {
  args: {
    title: "Recent Activities",
    children: (
      <div>
        <ChartCardItem>Meeting with John Doe scheduled</ChartCardItem>
        <ChartCardItem>Discovery Call with Jane Smith completed</ChartCardItem>
        <ChartCardItem>Team Sync with Bob Wilson cancelled</ChartCardItem>
        <ChartCardItem>Sales Demo with Alice Johnson rescheduled</ChartCardItem>
      </div>
    ),
  },
};

export const MixedContent: Story = {
  args: {
    title: "Top Performers",
    legend: sampleLegend,
    headerContent: <span className="text-subtle text-sm">This Month</span>,
    children: (
      <div>
        <ChartCardItem count="95%">Sarah Johnson</ChartCardItem>
        <ChartCardItem count="92%">Michael Chen</ChartCardItem>
        <ChartCardItem count="88%">Emily Rodriguez</ChartCardItem>
        <ChartCardItem count="85%">David Kim</ChartCardItem>
        <ChartCardItem count="82%">Lisa Anderson</ChartCardItem>
      </div>
    ),
  },
};

export const InteractiveLegend: Story = {
  args: {
    title: "Event Trends (Click to toggle)",
    legend: sampleLegend,
    enabledLegend: sampleLegend,
    onSeriesToggle: (label: string) => {
      console.log("Toggled series:", label);
    },
    children: <SimpleLineChart data={sampleChartData} />,
  },
};

export const CompactCard: Story = {
  args: {
    title: "Quick Stats",
    children: (
      <div className="p-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-emphasis text-2xl font-bold">142</div>
            <div className="text-subtle text-xs">Total</div>
          </div>
          <div className="text-center">
            <div className="text-emphasis text-2xl font-bold">98</div>
            <div className="text-subtle text-xs">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-emphasis text-2xl font-bold">12</div>
            <div className="text-subtle text-xs">Cancelled</div>
          </div>
        </div>
      </div>
    ),
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-1 gap-8 p-4">
      <div>
        <h3 className="text-emphasis mb-2 text-sm font-semibold">Default with Chart</h3>
        <ChartCard title="Event Trends" legend={sampleLegend}>
          <SimpleLineChart data={sampleChartData} />
        </ChartCard>
      </div>
      <div>
        <h3 className="text-emphasis mb-2 text-sm font-semibold">Loading State</h3>
        <ChartCard title="Event Trends" legend={sampleLegend} isPending />
      </div>
      <div>
        <h3 className="text-emphasis mb-2 text-sm font-semibold">With List Items</h3>
        <ChartCard title="Top Events">
          <ChartCardItem count={142}>30 Minute Meeting</ChartCardItem>
          <ChartCardItem count={98}>Discovery Call</ChartCardItem>
          <ChartCardItem count={76}>Team Sync</ChartCardItem>
        </ChartCard>
      </div>
      <div>
        <h3 className="text-emphasis mb-2 text-sm font-semibold">With Header Content</h3>
        <ChartCard
          title="Analytics"
          legend={sampleLegend}
          headerContent={<span className="text-subtle text-sm">Last 30 days</span>}>
          <SimpleLineChart data={sampleChartData} />
        </ChartCard>
      </div>
    </div>
  ),
  parameters: {
    layout: "padded",
  },
  decorators: [],
};
