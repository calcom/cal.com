import type { Logger } from "tslog";

import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { HttpError } from "@calcom/lib/http-error";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";

import { getEmailValidationService } from "../di/EmailValidation.container";

function getPiiFreeEmail(email: string): string {
  return email.toLowerCase().slice(0, 10);
}

interface ValidateBookingEmailParams {
  email: string;
  teamId: number | null;
  logger: Logger<unknown>;
  clientIP?: string;
}

export async function* validateBookingEmailGenerator({
  email,
  teamId,
  logger,
}: // clientIP,
ValidateBookingEmailParams): AsyncGenerator<null, void, unknown> {
  // Check if email validation feature is enabled for this team/org
  const featuresRepository = new FeaturesRepository(prisma);

  // If no team, skip validation (individual users)
  if (!teamId) {
    logger.info(
      "Email validation skipped - no team associated with event type",
      safeStringify({
        email,
        teamId,
      })
    );
    return;
  }

  const isEmailValidationEnabled = await featuresRepository.checkIfTeamHasFeature(
    teamId,
    "booking-email-validation"
  );

  if (!isEmailValidationEnabled) {
    logger.debug("Email validation feature not enabled for team", safeStringify({ teamId }));
    return;
  }

  try {
    const emailValidationService = getEmailValidationService();
    const emailValidationGenerator = emailValidationService.validateEmailGenerator({
      email,
      // Temporary commented out till we have confirmation that we have the client IP address here
      // ipAddress: clientIP,
    });

    const { value: cachedResult } = await emailValidationGenerator.next();

    if (cachedResult) {
      const result = cachedResult;
      const isBlocked = emailValidationService.isEmailBlocked(result.status);

      if (isBlocked) {
        throw new HttpError({
          statusCode: 400,
          message: "Unable to create booking with this email address.",
        });
      }
      return;
    }

    yield null;

    const { value: resultFromProvider } = await emailValidationGenerator.next();

    if (!resultFromProvider) {
      logger.warn(
        "No result from email validation provider",
        safeStringify({ email: getPiiFreeEmail(email), teamId })
      );
      return;
    }

    const isBlocked = emailValidationService.isEmailBlocked(resultFromProvider.status);

    if (isBlocked) {
      throw new HttpError({
        statusCode: 400,
        message: "Unable to create booking with this email address.",
      });
    }

    logger.info(
      "Email validation passed",
      safeStringify({
        email: getPiiFreeEmail(email),
        status: resultFromProvider.status,
        teamId,
      })
    );
  } catch (error) {
    if (error instanceof HttpError) {
      // Re-throw HttpError (blocked emails)
      throw error;
    }

    // Log service errors but don't block booking (fallback behavior)
    logger.error(
      "Email validation service error - allowing booking",
      safeStringify({
        email: getPiiFreeEmail(email),
        error: error instanceof Error ? error.message : "Unknown error",
        teamId,
      })
    );
  }
}
