import { startSpan } from "@sentry/nextjs";

import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { prisma } from "@calcom/prisma";

/**
 * Use Cases represent individual operations, like "Create Feature" or "Sign In" or "Toggle Feature".
 * Accept pre-validated input (from controllers) and handle authorization checks.
 * Use Repositories and Services to access data sources and communicate with external systems.
 * Use cases should not use other use cases. That's a code smell. It means the use case
 * does multiple things and should be broken down into multiple use cases.
 */
export function checkIfUserHasFeatureUseCase(userId: number, slug: string): Promise<boolean> {
  return startSpan({ name: "checkIfUserHasFeature UseCase", op: "function" }, async () => {
    const featuresRepository = new FeaturesRepository(prisma);

    return await featuresRepository.checkIfUserHasFeature(userId, slug);
  });
}
