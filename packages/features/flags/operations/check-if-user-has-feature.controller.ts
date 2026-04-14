import { metrics } from "@sentry/nextjs";
import { checkIfUserHasFeatureUseCase } from "./check-if-user-has-feature.use-case";

/**
 * Controllers perform authentication checks and input validation before passing the input
 * to the specific use cases. Controllers orchestrate Use Cases. They don't implement any
 * logic, but define the whole operations using use cases.
 */
export async function checkIfUserHasFeatureController(
  userId: number | undefined,
  slug: string
): Promise<boolean> {
  const startTime = performance.now();

  if (!userId) throw new Error("Missing userId in checkIfUserHasFeatureController");
  const userHasFeature = await checkIfUserHasFeatureUseCase(userId, slug);

  metrics.distribution("feature_flag.check.duration_ms", performance.now() - startTime, {
    attributes: { slug, layer: "controller" },
  });

  return userHasFeature;
}
