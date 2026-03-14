import process from "node:process";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { ColumnFilter } from "@calcom/features/data-table/lib/types";
import { getInsightsBookingService } from "@calcom/features/di/containers/InsightsBooking";
import {
  extractDateRangeFromColumnFilters,
  replaceDateRangeColumnFilter,
} from "@calcom/features/insights/lib/bookingUtils";
import { getDateRanges, getTimeView } from "@calcom/features/insights/server/insightsDateUtils";
import logger from "@calcom/lib/logger";
import { readonlyPrisma } from "@calcom/prisma";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const log = logger.getSubLogger({ prefix: [`/api/insights/chat`] });

type ChartType = "line" | "bar" | "pie" | "area";

interface EndpointConfig {
  name: string;
  description: string;
  dataKeys: string[];
  xAxisKey: string;
  suggestedChart: ChartType;
}

const AVAILABLE_ENDPOINTS: EndpointConfig[] = [
  {
    name: "eventTrends",
    description:
      "Booking event trends over time: created, completed, rescheduled, cancelled, no-show counts per period",
    dataKeys: ["Created", "Completed", "Rescheduled", "Cancelled", "No-Show (Host)", "No-Show (Guest)"],
    xAxisKey: "Month",
    suggestedChart: "line",
  },
  {
    name: "bookingKPIStats",
    description:
      "KPI stats: total created, completed, rescheduled, cancelled, no-show (host/guest), rating, CSAT with delta from previous period",
    dataKeys: ["count"],
    xAxisKey: "metric",
    suggestedChart: "bar",
  },
  {
    name: "popularEvents",
    description: "Most popular event types ranked by booking count",
    dataKeys: ["count"],
    xAxisKey: "eventTypeName",
    suggestedChart: "bar",
  },
  {
    name: "membersWithMostBookings",
    description: "Team members ranked by most total bookings",
    dataKeys: ["count"],
    xAxisKey: "name",
    suggestedChart: "bar",
  },
  {
    name: "membersWithLeastBookings",
    description: "Team members ranked by least total bookings",
    dataKeys: ["count"],
    xAxisKey: "name",
    suggestedChart: "bar",
  },
  {
    name: "membersWithMostCancelledBookings",
    description: "Team members ranked by most cancelled bookings",
    dataKeys: ["count"],
    xAxisKey: "name",
    suggestedChart: "bar",
  },
  {
    name: "membersWithMostNoShow",
    description: "Team members ranked by most no-show bookings",
    dataKeys: ["count"],
    xAxisKey: "name",
    suggestedChart: "bar",
  },
  {
    name: "membersWithHighestRatings",
    description: "Team members ranked by highest average ratings",
    dataKeys: ["count"],
    xAxisKey: "name",
    suggestedChart: "bar",
  },
  {
    name: "membersWithLowestRatings",
    description: "Team members ranked by lowest average ratings",
    dataKeys: ["count"],
    xAxisKey: "name",
    suggestedChart: "bar",
  },
  {
    name: "bookingsByHourStats",
    description: "Number of bookings grouped by hour of day (0-23)",
    dataKeys: ["count"],
    xAxisKey: "hour",
    suggestedChart: "bar",
  },
  {
    name: "csatOverTime",
    description: "Customer satisfaction (CSAT) score percentage over time",
    dataKeys: ["CSAT"],
    xAxisKey: "Month",
    suggestedChart: "line",
  },
  {
    name: "noShowHostsOverTime",
    description: "Number of host no-shows over time",
    dataKeys: ["Count"],
    xAxisKey: "Month",
    suggestedChart: "line",
  },
  {
    name: "membersWithMostCompletedBookings",
    description: "Team members ranked by most completed bookings",
    dataKeys: ["count"],
    xAxisKey: "name",
    suggestedChart: "bar",
  },
  {
    name: "membersWithLeastCompletedBookings",
    description: "Team members ranked by least completed bookings",
    dataKeys: ["count"],
    xAxisKey: "name",
    suggestedChart: "bar",
  },
];

const CHART_COLORS: string[] = [
  "#a855f7",
  "#22c55e",
  "#3b82f6",
  "#ef4444",
  "#64748b",
  "#f97316",
  "#06b6d4",
  "#ec4899",
];

function buildGroqPrompt(query: string): string {
  const endpointDescriptions = AVAILABLE_ENDPOINTS.map(
    (ep) => `- ${ep.name}: ${ep.description} (suggested chart: ${ep.suggestedChart})`
  ).join("\n");

  return `You are an AI assistant that helps users query their booking insights data. 
Given a user's natural language question about their booking data, determine:
1. Which data endpoint to query
2. What chart type best visualizes the answer
3. A short title for the chart
4. A brief description of what the chart shows

Available endpoints:
${endpointDescriptions}

Available chart types: line (for trends over time), bar (for comparisons/rankings), pie (for proportions/distributions), area (for cumulative/volume over time)

User query: "${query}"

Respond in JSON format only (no markdown, no code blocks):
{
  "endpoint": "<endpoint_name>",
  "chartType": "<line|bar|pie|area>",
  "title": "<short chart title>",
  "description": "<brief description of the chart>"
}`;
}

interface GroqChoice {
  message: { content: string };
}

interface GroqApiResult {
  choices: GroqChoice[];
}

interface GroqParsed {
  endpoint: string;
  chartType: string;
  title: string;
  description: string;
}

interface ChartConfig {
  chartType: ChartType;
  title: string;
  description: string;
  endpoint: string;
  dataKeys: string[];
  xAxisKey: string;
  colors: string[];
}

async function callGroq(prompt: string): Promise<ChartConfig> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY environment variable is not configured");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that maps natural language queries to data API endpoints. Always respond with valid JSON only, no markdown formatting.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 300,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${errorText}`);
  }

  const result: GroqApiResult = await response.json();
  const content = result.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No response content from Groq");
  }

  const parsed: GroqParsed = JSON.parse(content.trim());
  const matchedEndpoint = AVAILABLE_ENDPOINTS.find((ep) => ep.name === parsed.endpoint);
  if (!matchedEndpoint) {
    throw new Error(`Unknown endpoint: ${parsed.endpoint}`);
  }

  const validChartTypes: ChartType[] = ["line", "bar", "pie", "area"];
  const chartType: ChartType = validChartTypes.includes(parsed.chartType as ChartType)
    ? (parsed.chartType as ChartType)
    : matchedEndpoint.suggestedChart;

  return {
    chartType,
    title: parsed.title || "Insights Chart",
    description: parsed.description || "",
    endpoint: matchedEndpoint.name,
    dataKeys: matchedEndpoint.dataKeys,
    xAxisKey: matchedEndpoint.xAxisKey,
    colors: CHART_COLORS.slice(0, matchedEndpoint.dataKeys.length),
  };
}

interface RequestBody {
  query: string;
  scope: "user" | "team" | "org";
  selectedTeamId?: number;
  timeZone: string;
  columnFilters?: ColumnFilter[];
}

function transformMembersToChart(
  data: Array<{
    userId: number;
    user: { id: number; username: string | null; name: string | null; email: string; avatarUrl: string };
    emailMd5: string;
    count: number;
  }>
): Array<Record<string, unknown>> {
  return data.map((item) => ({
    name: item.user.name || `User ${item.userId}`,
    count: item.count,
  }));
}

async function fetchDataForEndpoint(
  endpointName: string,
  userId: number,
  organizationId: number | null,
  weekStart: string,
  body: RequestBody
): Promise<Array<Record<string, unknown>>> {
  const { scope, selectedTeamId, timeZone, columnFilters } = body;

  const service = getInsightsBookingService({
    options: {
      scope,
      userId,
      orgId: organizationId,
      ...(selectedTeamId && { teamId: selectedTeamId }),
    },
    filters: {
      ...(columnFilters && { columnFilters }),
    },
  });

  switch (endpointName) {
    case "eventTrends": {
      const { startDate, endDate } = extractDateRangeFromColumnFilters(columnFilters);
      const timeView = getTimeView(startDate, endDate);
      const dateRanges = getDateRanges({ startDate, endDate, timeView, timeZone, weekStart });
      const trendData = await service.getEventTrendsStats({ timeZone, dateRanges });
      return trendData as Array<Record<string, unknown>>;
    }

    case "bookingKPIStats": {
      const currentStats = await service.getBookingStats();
      const previousPeriodDates = service.calculatePreviousPeriodDates();
      const previousColumnFilters = replaceDateRangeColumnFilter({
        columnFilters,
        newStartDate: previousPeriodDates.startDate,
        newEndDate: previousPeriodDates.endDate,
      });
      const previousService = getInsightsBookingService({
        options: {
          scope,
          userId,
          orgId: organizationId,
          ...(selectedTeamId && { teamId: selectedTeamId }),
        },
        filters: { ...(previousColumnFilters && { columnFilters: previousColumnFilters }) },
      });
      const previousStats = await previousService.getBookingStats();
      return [
        { metric: "Created", count: currentStats.total_bookings, prev: previousStats.total_bookings },
        {
          metric: "Completed",
          count: currentStats.completed_bookings,
          prev: previousStats.completed_bookings,
        },
        {
          metric: "Rescheduled",
          count: currentStats.rescheduled_bookings,
          prev: previousStats.rescheduled_bookings,
        },
        {
          metric: "Cancelled",
          count: currentStats.cancelled_bookings,
          prev: previousStats.cancelled_bookings,
        },
        {
          metric: "No-Show (Host)",
          count: currentStats.no_show_host_bookings,
          prev: previousStats.no_show_host_bookings,
        },
        { metric: "No-Show (Guest)", count: currentStats.no_show_guests, prev: previousStats.no_show_guests },
      ];
    }

    case "popularEvents": {
      const popData = await service.getPopularEventsStats();
      return popData.map((item) => ({ eventTypeName: item.eventTypeName, count: item.count }));
    }

    case "membersWithMostBookings": {
      const mbData = await service.getMembersStatsWithCount({ type: "all", sortOrder: "DESC" });
      return transformMembersToChart(mbData);
    }

    case "membersWithLeastBookings": {
      const lbData = await service.getMembersStatsWithCount({ type: "all", sortOrder: "ASC" });
      return transformMembersToChart(lbData);
    }

    case "membersWithMostCancelledBookings": {
      const mcData = await service.getMembersStatsWithCount({ type: "cancelled", sortOrder: "DESC" });
      return transformMembersToChart(mcData);
    }

    case "membersWithMostNoShow": {
      const nsData = await service.getMembersStatsWithCount({ type: "noShow", sortOrder: "DESC" });
      return transformMembersToChart(nsData);
    }

    case "membersWithHighestRatings": {
      const hrData = await service.getMembersRatingStats("DESC");
      return transformMembersToChart(hrData);
    }

    case "membersWithLowestRatings": {
      const lrData = await service.getMembersRatingStats("ASC");
      return transformMembersToChart(lrData);
    }

    case "membersWithMostCompletedBookings": {
      const mcompData = await service.getMembersStatsWithCount({
        type: "accepted",
        sortOrder: "DESC",
        completed: true,
      });
      return transformMembersToChart(mcompData);
    }

    case "membersWithLeastCompletedBookings": {
      const lcompData = await service.getMembersStatsWithCount({
        type: "accepted",
        sortOrder: "ASC",
        completed: true,
      });
      return transformMembersToChart(lcompData);
    }

    case "bookingsByHourStats": {
      const hourData = await service.getBookingsByHourStats({ timeZone });
      return hourData.map((item) => ({
        hour: `${item.hour.toString().padStart(2, "0")}:00`,
        count: item.count,
      }));
    }

    case "csatOverTime": {
      const { startDate, endDate } = extractDateRangeFromColumnFilters(columnFilters);
      const timeView = getTimeView(startDate, endDate);
      const dateRanges = getDateRanges({ startDate, endDate, timeView, timeZone, weekStart });
      const csatData = await service.getCSATOverTimeStats({ timeZone, dateRanges });
      return csatData as Array<Record<string, unknown>>;
    }

    case "noShowHostsOverTime": {
      const { startDate, endDate } = extractDateRangeFromColumnFilters(columnFilters);
      const timeView = getTimeView(startDate, endDate);
      const dateRanges = getDateRanges({ startDate, endDate, timeView, timeZone, weekStart });
      const nsHostData = await service.getNoShowHostsOverTimeStats({ timeZone, dateRanges });
      return nsHostData as Array<Record<string, unknown>>;
    }

    default:
      return [];
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const headersList = await headers();
  const cookiesList = await cookies();
  const legacyReq = buildLegacyRequest(headersList, cookiesList);

  const session = await getServerSession({ req: legacyReq });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: RequestBody = await req.json();
    const { query } = body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const user = await readonlyPrisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, organizationId: true, weekStart: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const prompt = buildGroqPrompt(query.trim());
    const chartConfig = await callGroq(prompt);
    const data = await fetchDataForEndpoint(
      chartConfig.endpoint,
      user.id,
      user.organizationId,
      user.weekStart,
      body
    );

    return NextResponse.json({ ...chartConfig, data });
  } catch (err) {
    log.error("Error processing insights chat query:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Failed to process query. Please try again." }, { status: 500 });
  }
}
