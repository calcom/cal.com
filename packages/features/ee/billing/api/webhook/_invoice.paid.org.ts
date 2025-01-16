import { prisma } from "@calcom/prisma";

import type { SWHMap } from "./__handler";

const handler = async (data: SWHMap["invoice.paid"]["data"]) => {
  const invoice = data.object;

  // Get metadata from the subscription
  const onboardingForm = await prisma.organizationOnboarding.findFirst({
    where: {
      stripeCustomerId: invoice.customer,
    },
  });

  if (!onboardingForm) {
    console.log(`No organization onboarding found for subscription ${invoice.subscription}`);
    return { success: true };
  }

  console.log(`Marking organization onboarding ${onboardingForm.id} as paid`);

  return { success: true };
};

export default handler;
