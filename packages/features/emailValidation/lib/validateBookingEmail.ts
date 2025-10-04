import type { Logger } from "tslog";

import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { HttpError } from "@calcom/lib/http-error";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";

import { getEmailValidationService } from "../di/EmailValidation.container";

interface ValidateBookingEmailParams {
  email: string;
  teamId: number | null;
  logger: Logger<unknown>;
  clientIP?: string;
}

interface EmailValidationResult {
  error: HttpError | null;
  startProviderValidation(): Promise<void>;
  waitForProviderValidation(promise: Promise<void> | null): Promise<void>;
}

const validationErrorMessage =
  "This email address cannot be used for bookings. Please use a different email.";
/**
 * Performs fast email validation checks (cache + Cal.com DB).
 * Returns immediately with methods to start/wait for provider validation.
 *
 * If shouldBlock from fast checks, throws HttpError immediately.
 * Otherwise, returns methods to start slow provider validation and wait for it later.
 */
export async function validateBookingEmail({
  email,
  teamId,
  logger,
}: // clientIP,
ValidateBookingEmailParams): Promise<EmailValidationResult | null> {
  // Check if email validation feature is enabled for this team/org
  const featuresRepository = new FeaturesRepository(prisma);

  // If no team, skip validation (individual users)
  if (!teamId) {
    logger.debug("Email validation skipped - no team associated with event type", safeStringify({ teamId }));
    return null;
  }

  const isEmailValidationEnabled = await featuresRepository.checkIfTeamHasFeature(
    teamId,
    "booking-email-validation"
  );

  if (!isEmailValidationEnabled) {
    logger.debug("Email validation feature not enabled for team", safeStringify({ teamId }));
    return null;
  }

  try {
    const emailValidationService = getEmailValidationService();

    // Fast check: cache + Cal.com DB lookup
    const calcomResult = await emailValidationService.validateWithCalcom(email);

    // Found in cache or verified by Cal.com
    if (calcomResult.shouldBlock) {
      throw new HttpError({
        statusCode: 400,
        message: validationErrorMessage,
      });
    }

    if (!calcomResult.continueWithProvider) {
      return null; // No provider validation needed
    }

    const result: EmailValidationResult = {
      error: null,
      async startProviderValidation() {
        try {
          const providerResult = await emailValidationService.validateWithProvider({
            request: { email },
            skipCache: true,
          });
          if (providerResult.shouldBlock) {
            throw new HttpError({
              statusCode: 400,
              message: validationErrorMessage,
            });
          }
        } catch (error) {
          if (error instanceof HttpError) {
            // We catch and store the error because error could happen even before we await waitForProviderValidation
            // This prevents unhandled promise rejection
            result.error = error;
            return;
          }
          logger.error("Provider email validation unhandled error - allowing booking", safeStringify(error));
        }
      },
      async waitForProviderValidation(promise: Promise<void> | null) {
        if (!promise) {
          return;
        }
        await promise;
        if (result.error) {
          throw result.error;
        }
      },
    };

    return result;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error; // Re-throw blocking errors
    }
    logger.error("Email validation unhandled error - allowing booking", safeStringify(error));
    return null;
  }
}
