import z from "zod";

import { HttpError } from "@calcom/lib/http-error";
import { safeStringify } from "@calcom/lib/safeStringify";

import logger from "../../logger";

const vercelApiForProjectUrl = `https://api.vercel.com/v9/projects/${process.env.PROJECT_ID_VERCEL}`;
const vercelDomainApiResponseSchema = z.object({
  error: z
    .object({
      code: z.string().nullish(),
      domain: z.string().nullish(),
    })
    .optional(),
});

export const createDomain = async (domain: string) => {
  assertVercelEnvVars(process.env);
  logger.info(`Creating domain in Vercel: ${domain}`);
  const response = await fetch(`${vercelApiForProjectUrl}/domains?teamId=${process.env.TEAM_ID_VERCEL}`, {
    body: JSON.stringify({ name: domain }),
    headers: {
      Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN_VERCEL}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const data = vercelDomainApiResponseSchema.parse(await response.json());

  if (!data.error) {
    return true;
  }

  return handleDomainCreationError(data.error);
};

export const deleteDomain = async (domain: string) => {
  logger.info(`Deleting domain in Vercel: ${domain}`);
  assertVercelEnvVars(process.env);

  const response = await fetch(
    `${vercelApiForProjectUrl}/domains/${domain}?teamId=${process.env.TEAM_ID_VERCEL}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN_VERCEL}`,
      },
      method: "DELETE",
    }
  );

  const data = vercelDomainApiResponseSchema.parse(await response.json());
  if (!data.error) {
    return true;
  }

  return handleDomainDeletionError(data.error);
};

function handleDomainCreationError(error: { code?: string | null; domain?: string | null }) {
  // Domain is already owned by another team but you can request delegation to access it
  if (error.code === "forbidden") {
    const errorMessage = "Domain is already owned by another team";
    logger.error(
      safeStringify({
        errorMessage,
        vercelError: error,
      })
    );
    throw new HttpError({
      message: errorMessage,
      statusCode: 400,
    });
  }

  if (error.code === "domain_taken") {
    const errorMessage = "Domain is already being used by a different project";
    logger.error(
      safeStringify({
        errorMessage,
        vercelError: error,
      })
    );
    throw new HttpError({
      message: errorMessage,
      statusCode: 400,
    });
  }

  if (error.code === "domain_already_in_use") {
    // Domain is already configured correctly, this is not an error when it happens during creation as it could be re-attempt to create an existing domain
    return true;
  }

  const errorMessage = `Failed to create domain on Vercel: ${error.domain}`;
  logger.error(safeStringify({ errorMessage, vercelError: error }));
  throw new HttpError({
    message: errorMessage,
    statusCode: 400,
  });
}

function handleDomainDeletionError(error: { code?: string | null; domain?: string | null }) {
  if (error.code === "not_found") {
    // Domain is already deleted
    return true;
  }

  // Domain is already owned by another team but you can request delegation to access it
  if (error.code === "forbidden") {
    const errorMessage = "Domain is owned by another team";
    logger.error(
      safeStringify({
        errorMessage,
        vercelError: error,
      })
    );
    throw new HttpError({
      message: errorMessage,
      statusCode: 400,
    });
  }

  const errorMessage = `Failed to take action for domain: ${error.domain}`;
  logger.error(safeStringify({ errorMessage, vercelError: error }));
  throw new HttpError({
    message: errorMessage,
    statusCode: 400,
  });
}

function assertVercelEnvVars(env: typeof process.env): asserts env is {
  PROJECT_ID_VERCEL: string;
  TEAM_ID_VERCEL: string;
  AUTH_BEARER_TOKEN_VERCEL: string;
} & typeof process.env {
  if (!env.PROJECT_ID_VERCEL) {
    throw new Error("Missing env var: PROJECT_ID_VERCEL");
  }

  // TEAM_ID_VERCEL is optional

  if (!env.AUTH_BEARER_TOKEN_VERCEL) {
    throw new Error("Missing env var: AUTH_BEARER_TOKEN_VERCEL");
  }
}
