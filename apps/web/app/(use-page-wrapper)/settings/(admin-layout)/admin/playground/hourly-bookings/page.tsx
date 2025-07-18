"use client";

import { ChartCard } from "@calcom/features/insights/components/ChartCard";
import { HourlyBookingsChartContent } from "@calcom/features/insights/components/HourlyBookingsChart";
import { useLocale } from "@calcom/lib/hooks/useLocale";

// Sample data for playground testing
const sampleHourlyBookingsData = [
  { hour: 0, bookingCount: 4 },
  { hour: 1, bookingCount: 10 },
  { hour: 2, bookingCount: 3 },
  { hour: 3, bookingCount: 12 },
  { hour: 4, bookingCount: 3 },
  { hour: 5, bookingCount: 7 },
  { hour: 6, bookingCount: 6 },
  { hour: 7, bookingCount: 4 },
  { hour: 8, bookingCount: 9 },
  { hour: 9, bookingCount: 7 },
  { hour: 10, bookingCount: 6 },
  { hour: 11, bookingCount: 5 },
  { hour: 12, bookingCount: 8 },
  { hour: 13, bookingCount: 5 },
  { hour: 14, bookingCount: 9 },
  { hour: 15, bookingCount: 9 },
  { hour: 16, bookingCount: 4 },
  { hour: 17, bookingCount: 5 },
  { hour: 18, bookingCount: 4 },
  { hour: 19, bookingCount: 6 },
  { hour: 20, bookingCount: 6 },
  { hour: 21, bookingCount: 12 },
  { hour: 22, bookingCount: 4 },
  { hour: 23, bookingCount: 10 },
];

export default function HourlyBookingsPlayground() {
  const { t } = useLocale();
  return (
    <div className="space-y-6 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Hourly Bookings Playground</h1>
        <p className="mt-2 text-gray-600">
          This page demonstrates the HourlyBookingChartContent component with sample data.
        </p>
      </div>

      <div className="max-w-4xl">
        <ChartCard title={t("hourly_bookings")}>
          <HourlyBookingsChartContent data={sampleHourlyBookingsData} />
        </ChartCard>
      </div>

      <div className="mt-8 rounded-lg bg-gray-50 p-4">
        <h2 className="mb-2 text-lg font-semibold">Sample Data Used:</h2>
        <pre className="overflow-auto text-sm text-gray-700">
          {JSON.stringify(sampleHourlyBookingsData, null, 2)}
        </pre>
      </div>
    </div>
  );
}
