"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { ChartCard } from "@calcom/web/modules/insights/components/ChartCard";
import {
  legend,
  RoutingFunnelContent,
} from "@calcom/web/modules/insights/components/routing/RoutingFunnelContent";

// Random sample data for playground testing
const sampleRoutingFunnelData = [
  {
    name: "Week 1",
    formattedDateFull: "Week 1",
    totalSubmissions: 150,
    successfulRoutings: 120,
    acceptedBookings: 95,
  },
  {
    name: "Week 2",
    formattedDateFull: "Week 2",
    totalSubmissions: 180,
    successfulRoutings: 145,
    acceptedBookings: 110,
  },
  {
    name: "Week 3",
    formattedDateFull: "Week 3",
    totalSubmissions: 200,
    successfulRoutings: 160,
    acceptedBookings: 125,
  },
  {
    name: "Week 4",
    formattedDateFull: "Week 4",
    totalSubmissions: 170,
    successfulRoutings: 135,
    acceptedBookings: 105,
  },
  {
    name: "Week 5",
    formattedDateFull: "Week 5",
    totalSubmissions: 220,
    successfulRoutings: 175,
    acceptedBookings: 140,
  },
  {
    name: "Week 6",
    formattedDateFull: "Week 6",
    totalSubmissions: 190,
    successfulRoutings: 155,
    acceptedBookings: 120,
  },
];

export default function RoutingFunnelPlayground() {
  const { t } = useLocale();
  return (
    <div className="stack-y-6 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Routing Funnel Playground</h1>
        <p className="mt-2 text-gray-600">
          This page demonstrates the RoutingFunnelContent component with sample data.
        </p>
      </div>

      <div className="max-w-4xl">
        <ChartCard
          title={t("routing_funnel")}
          subtitle="Hello world!"
          legend={legend}
          legendSize="sm"
          cta={{
            label: "Show all",
            onClick: () => {
              alert("hello!");
            },
          }}>
          <RoutingFunnelContent data={sampleRoutingFunnelData} />
        </ChartCard>
      </div>

      <div className="mt-8 rounded-lg bg-gray-50 p-4">
        <h2 className="mb-2 text-lg font-semibold">Sample Data Used:</h2>
        <pre className="overflow-auto text-sm text-gray-700">
          {JSON.stringify(sampleRoutingFunnelData, null, 2)}
        </pre>
      </div>
    </div>
  );
}
