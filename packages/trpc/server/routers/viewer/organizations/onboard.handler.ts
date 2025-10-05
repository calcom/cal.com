import { OrganizationOnboardingService } from "@calcom/features/ee/organizations/lib/OrganizationOnboardingService";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import type { TrpcSessionUser } from "../../../types";
import type { TOnboardInputSchema } from "./onboard.schema";

type OnboardOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TOnboardInputSchema;
};

const log = logger.getSubLogger({ prefix: ["viewer", "organizations", "onboard"] });

export const onboardHandler = async ({ input, ctx }: OnboardOptions) => {
  log.debug("Onboard handler called", safeStringify({ userId: ctx.user.id }));

  const service = new OrganizationOnboardingService(ctx.user);
  const result = await service.processOnboarding(input);

  return result;
};

export default onboardHandler;
