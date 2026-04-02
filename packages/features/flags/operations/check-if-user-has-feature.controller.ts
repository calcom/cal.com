import { startSpan } from "@sentry/nextjs";
import { checkIfUserHasFeatureUseCase } from "./check-if-user-has-feature.use-case";

/**
 * Controllers use Presenters to convert the data to a UI-friendly format just before
 * returning it to the "consumer". This helps us ship less JavaScript to the client (logic
 * and libraries to convert the data), helps prevent leaking any sensitive properties, like
 * emails or hashed passwords, and also helps us slim down the amount of data we're sending
 * back to the client.
 */
function presenter(userHasFeature: boolean) {
  return startSpan({ name: "checkIfUserHasFeature Presenter", op: "serialize" }, () => {
    return userHasFeature;
  });
}

/**
 * Controllers perform authentication checks and input validation before passing the input
 * to the specific use cases. Controllers orchestrate Use Cases. They don't implement any
 * logic, but define the whole operations using use cases.
 */
export async function checkIfUserHasFeatureController(
  userId: number | undefined,
  slug: string
): Promise<ReturnType<typeof presenter>> {
  return await startSpan({ name: "checkIfUserHasFeature Controller" }, async () => {
    if (!userId) throw new Error("Missing userId in checkIfUserHasFeatureController");
    const userHasFeature = await checkIfUserHasFeatureUseCase(userId, slug);
    return presenter(userHasFeature);
  });
}
