// import { InsightsRoutingService } from "@calcom/lib/server/service/insightsRouting";
// import { readonlyPrisma } from "@calcom/prisma";

export default async function RoutingFunnel() {
  return null;
  // const insightsRoutingService = new InsightsRoutingService({
  //   prisma: readonlyPrisma,
  //   options: { scope: "org", userId: 16, orgId: 5, teamId: undefined },
  //   filters: {
  //     startDate: "2025-06-20T22:00:00.000Z",
  //     endDate: "2025-06-27T21:59:59.999Z",
  //   },
  // });

  // const dateRanges = [
  //   {
  //     startDate: "2025-06-20T22:00:00.000Z",
  //     endDate: "2025-06-27T21:59:59.999Z",
  //     formattedDate: "2025-06-20 to 2025-06-27",
  //   },
  // ];

  // const routingFunnelData = await insightsRoutingService.getRoutingFunnelData(dateRanges);
  // console.log("💡 TEST routingFunnelData", routingFunnelData);

  // return (
  //   <div className="space-y-6">
  //     <h1 className="text-3xl font-bold">Routing Form Funnel Analysis</h1>
  //     <pre className="rounded bg-gray-100 p-4">{JSON.stringify(routingFunnelData, null, 2)}</pre>
  //   </div>
  // );
}
