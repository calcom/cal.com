import { getUserFeatureRepository } from "@calcom/features/di/containers/UserFeatureRepository";
import { metrics } from "@sentry/nextjs";

/**
 * Use Cases represent individual operations, like "Create Feature" or "Sign In" or "Toggle Feature".
 * Accept pre-validated input (from controllers) and handle authorization checks.
 * Use Repositories and Services to access data sources and communicate with external systems.
 * Use cases should not use other use cases. That's a code smell. It means the use case
 * does multiple things and should be broken down into multiple use cases.
 */
export async function checkIfUserHasFeatureUseCase(userId: number, slug: string): Promise<boolean> {
  const startTime = performance.now();
  const userFeatureRepository = getUserFeatureRepository();
  const result = await userFeatureRepository.checkIfUserHasFeature(userId, slug);

  metrics.distribution("feature_flag.check.duration_ms", performance.now() - startTime, {
    attributes: { slug, layer: "use-case" },
  });
  metrics.count("feature_flag.check.calls", 1, {
    attributes: { slug, layer: "use-case" },
  });

  return result;
}
