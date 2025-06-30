import { DropOffFunnel } from "@calcom/features/insights/components/DropOffFunnel";
import kysely from "@calcom/kysely";
import { InsightsRoutingService } from "@calcom/lib/server/service/insightsRouting";

// async function getTestData() {
//   const [user] = await kysely
//     .selectFrom("users")
//     .where("email", "=", "owner1-acme@example.com")
//     .selectAll()
//     .execute();

//   const [membership] = await kysely
//     .selectFrom("Membership")
//     .innerJoin("Team", "Team.id", "Membership.teamId")
//     .where("Membership.userId", "=", user.id)
//     .where("Team.parentId", "is", null)
//     .selectAll()
//     .execute();

//   return {
//     userId: user.id,
//     teamId: membership.teamId,
//   };
// }

export default async function Dropoff() {
  const insightsRoutingService = new InsightsRoutingService({
    kysely,
    options: { scope: "org", userId: 16, orgId: 5 },
    filters: {
      startDate: "2025-06-20T22:00:00.000Z",
      endDate: "2025-06-27T21:59:59.999Z",
    },
  });
  await insightsRoutingService.init();
  const dropOffData = await insightsRoutingService.getDropOffData();
  console.log("💡 TEST dropOffData", dropOffData);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Routing Form Drop-Off Analysis</h1>
      <DropOffFunnel data={dropOffData} showMetrics={true} />
    </div>
  );
}
