# How to Add a New Booking Chart to Cal.com Insights Page

This guide walks you through creating a new booking chart component for the insights page, covering the entire stack from UI component to backend service.

## Overview

The insights booking system follows this architecture:

```
UI Component → tRPC Handler → Insights Service → Database Query → Response
```

## Step 1: Create the UI Component

Create your chart component in `packages/features/insights/components/booking/`:

```typescript
// packages/features/insights/components/booking/MyNewChart.tsx
import { LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Line, ResponsiveContainer } from "recharts";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";

import { useInsightsBookingParameters } from "../../hooks/useInsightsBookingParameters";
import { ChartCard } from "../ChartCard";
import { LoadingInsight } from "../LoadingInsights";

export const MyNewChart = () => {
  const { t } = useLocale();
  const insightsBookingParams = useInsightsBookingParameters();

  const { data, isSuccess, isPending, isError } = trpc.viewer.insights.myNewChartData.useQuery(
    insightsBookingParams,
    {
      staleTime: 180000, // 3 minutes
      refetchOnWindowFocus: false,
      trpc: { context: { skipBatch: true } },
    }
  );

  if (isPending) return <LoadingInsight />;

  return (
    <ChartCard title={t("my_new_chart_title")} isPending={isPending} isError={isError}>
      {isSuccess && data?.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-64 items-center justify-center">
          <p className="text-gray-500">{t("no_data_yet")}</p>
        </div>
      )}
    </ChartCard>
  );
};
```

## Step 2: Add Component to Barrel Export

Update the booking components index file:

```typescript
// packages/features/insights/components/booking/index.ts
export { AverageEventDurationChart } from "./AverageEventDurationChart";
export { BookingKPICards } from "./BookingKPICards";
// ... existing exports
export { MyNewChart } from "./MyNewChart"; // Add this line
```

## Step 3: Add Component to Insights View

Add your component to the main insights page:

```typescript
// apps/web/modules/insights/insights-view.tsx
import {
  AverageEventDurationChart,
  BookingKPICards, // ... existing imports
  MyNewChart, // Add this import
} from "@calcom/features/insights/components/booking";

export default function InsightsPage() {
  // ... existing code

  return (
    <div className="space-y-6">
      {/* Existing components */}
      <BookingKPICards />
      <EventTrendsChart />

      {/* Add your new chart */}
      <MyNewChart />

      {/* Other existing components */}
    </div>
  );
}
```

## Step 4: Create tRPC Handler

Add the tRPC endpoint in the insights router using the `getInsightsBookingService()` DI container function:

```typescript
// packages/features/insights/server/trpc-router.ts
import { bookingRepositoryBaseInputSchema } from "@calcom/features/insights/server/raw-data.schema";
import { userBelongsToTeamProcedure } from "@calcom/trpc/server/procedures/authedProcedure";

import { TRPCError } from "@trpc/server";

export const insightsRouter = router({
  // ... existing procedures

  myNewChartData: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ ctx, input }) => {
      // `createInsightsBookingService` is defined at the root level in this file
      const insightsBookingService = createInsightsBookingService(ctx, input);

      try {
        return await insightsBookingService.getMyNewChartData();
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
});
```

## Step 5: Add Service Method to InsightsBookingBaseService

Add your new method to the `InsightsBookingBaseService` class:

```typescript
// packages/lib/server/service/InsightsBookingBaseService.ts
export class InsightsBookingBaseService {
  // ... existing methods

  async getMyNewChartData() {
    const baseConditions = await this.getBaseConditions();

    // Example: Get booking counts by day using raw SQL for performance
    // Note: Use Prisma.sql for the entire query (Prisma v6 requirement)
    // Prisma v6 no longer allows mixing template literals with Prisma.sql fragments
    const query = Prisma.sql`
      SELECT
        DATE("createdAt") as date,
        COUNT(*)::int as "bookingsCount"
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    const data = await this.prisma.$queryRaw<
      Array<{
        date: Date;
        bookingsCount: number;
      }>
    >(query);

    // Transform the data for the chart
    return data.map((item) => ({
      date: item.date.toISOString().split("T")[0], // Format as YYYY-MM-DD
      value: item.bookingsCount,
    }));
  }
}
```

## Best Practices

1. **Use `getInsightsBookingService()`**: Always use the DI container function for consistent service creation
2. **Raw SQL for Performance**: Use `$queryRaw` for complex aggregations and better performance
3. **Base Conditions**: Always use `await this.getBaseConditions()` for proper filtering and permissions
4. **Error Handling**: Wrap service calls in try-catch blocks with `TRPCError`
5. **Loading States**: Always destructure `isPending` and `isError` from the query and pass them to `ChartCard`
6. **ChartCard Props**: Pass `isPending` and `isError` to `ChartCard` - it will automatically calculate the loading state
7. **Consistent Styling**: Use `recharts` for new charts
8. **Date Handling**: Use `getDateRanges()` and `getTimeView()` for time-based charts
9. **Prisma v6 Compatibility**: Use `Prisma.sql` for the entire query instead of mixing template literals with SQL fragments

## Loading State Management

`ChartCard` automatically handles loading states. Simply pass `isPending` and `isError`:

```typescript
const { data, isPending, isError } = trpc.viewer.insights.myData.useQuery(...);

// ChartCard will automatically show:
// - "loading" state when isPending is true
// - "error" state when isError is true
// - "loaded" state when both are false
return (
  <ChartCard title={t("my_chart")} isPending={isPending} isError={isError}>
    {/* Your chart content */}
  </ChartCard>
);
```

This enables E2E tests to verify that all charts load successfully by checking the `data-loading-state` attribute.
