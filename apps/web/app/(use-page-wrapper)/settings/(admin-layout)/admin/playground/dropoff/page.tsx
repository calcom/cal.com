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
    options: { scope: "org", teamId: undefined, userId: 16, orgId: 5 },
    filters: {
      startDate: "2025-06-20T22:00:00.000Z",
      endDate: "2025-06-27T21:59:59.999Z",
    },
  });
  const responses = await insightsRoutingService.getDropOffData();
  console.log("💡 TEST responses", responses);

  return (
    <div>
      <h1 className="text-3xl font-bold">Drop Off</h1>

      <DropOffFunnel
        data={[
          {
            value: 100,
            name: "Impressions",
            fill: "#8884d8",
          },
          {
            value: 80,
            name: "Clicks",
            fill: "#83a6ed",
          },
          {
            value: 50,
            name: "Visits",
            fill: "#8dd1e1",
          },
          {
            value: 40,
            name: "Inquiries",
            fill: "#82ca9d",
          },
          {
            value: 26,
            name: "Orders",
            fill: "#a4de6c",
          },
        ]}
      />
    </div>
  );
}
