"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { BookingsByHourChartContent } from "@calcom/web/modules/insights/components/booking/BookingsByHourChart";
import { ChartCard } from "@calcom/web/modules/insights/components/ChartCard";

// Sample data for playground testing
const sampleBookingsByHourStats = [
  { hour: 0, count: 4 },
  { hour: 1, count: 10 },
  { hour: 2, count: 3 },
  { hour: 3, count: 12 },
  { hour: 4, count: 3 },
  { hour: 5, count: 7 },
  { hour: 6, count: 6 },
  { hour: 7, count: 4 },
  { hour: 8, count: 9 },
  { hour: 9, count: 7 },
  { hour: 10, count: 6 },
  { hour: 11, count: 5 },
  { hour: 12, count: 8 },
  { hour: 13, count: 5 },
  { hour: 14, count: 9 },
  { hour: 15, count: 9 },
  { hour: 16, count: 4 },
  { hour: 17, count: 5 },
  { hour: 18, count: 4 },
  { hour: 19, count: 6 },
  { hour: 20, count: 6 },
  { hour: 21, count: 12 },
  { hour: 22, count: 4 },
  { hour: 23, count: 10 },
];

export default function BookingsByHourPlayground() {
  const { t } = useLocale();
  return (
    <div className="stack-y-6 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Bookings by Hour Playground</h1>
        <p className="mt-2 text-gray-600">
          This page demonstrates the BookingsByHourChartContent component with sample data.
        </p>
      </div>

      <div className="max-w-4xl">
        <ChartCard title={t("bookings_by_hour")}>
          <BookingsByHourChartContent data={sampleBookingsByHourStats} />
        </ChartCard>
      </div>

      <div className="mt-8 rounded-lg bg-gray-50 p-4">
        <h2 className="mb-2 text-lg font-semibold">Sample Data Used:</h2>
        <pre className="overflow-auto text-sm text-gray-700">
          {JSON.stringify(sampleBookingsByHourStats, null, 2)}
        </pre>
      </div>
    </div>
  );
}
