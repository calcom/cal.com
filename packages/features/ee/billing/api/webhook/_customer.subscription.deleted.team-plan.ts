import type { SWHMap } from "./__handler";

const handler = async (data: SWHMap["customer.subscription.deleted"]["data"]) => {
  const subscription = data.object;
  console.log("subscription", subscription);
  const product = subscription.plan.product; // prod_QHXJrukWIu9X66
  const price = subscription.plan.id; // price_1PQyFzH8UDiwIftkqcog1fM4
  // await prisma.team.update({
  //   where: {
  //     metadata: {
  //       path: ["subscriptionId"],
  //       equals: subscription.id,
  //     },
  //   },
  //   data: { pendingPayment: true },
  // });
};

export default handler;
