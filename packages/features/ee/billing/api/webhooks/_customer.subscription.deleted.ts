import type { SWHMap } from "./__handler";

const handler = async (data: SWHMap["customer.subscription.deleted"]["data"]) => {
  const subscription = data.object;
  await prisma.team.update({
    where: {
      metadata: {
        path: ["subscriptionId"],
        equals: subscription.id,
      },
    },
    data: { pendingPayment: true },
  });
};

export default handler;
