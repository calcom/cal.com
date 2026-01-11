// !IMPORTANT! changes to this file requires publishing new version of platform libraries in order for the changes to be applied to APIV2
import { createHash } from "crypto";
import type { GetServerSidePropsContext } from "next";
import { stringify } from "querystring";
import { v4 as uuidv4 } from "uuid";
import z from "zod";

import { enrichFormWithMigrationData } from "@calcom/app-store/routing-forms/enrichFormWithMigrationData";
import { getAbsoluteEventTypeRedirectUrlWithEmbedSupport } from "@calcom/app-store/routing-forms/getEventTypeRedirectUrl";
import { getResponseToStore } from "@calcom/app-store/routing-forms/lib/getResponseToStore";
import { getSerializableForm } from "@calcom/app-store/routing-forms/lib/getSerializableForm";
import { getServerTimingHeader } from "@calcom/app-store/routing-forms/lib/getServerTimingHeader";
import { handleResponse } from "@calcom/app-store/routing-forms/lib/handleResponse";
import { findMatchingRoute } from "@calcom/app-store/routing-forms/lib/processRoute";
import { substituteVariables } from "@calcom/app-store/routing-forms/lib/substituteVariables";
import type { FormResponse } from "@calcom/app-store/routing-forms/types/types";
import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { isAuthorizedToViewFormOnOrgDomain } from "@calcom/features/routing-forms/lib/isAuthorizedToViewForm";
import { PrismaRoutingFormRepository } from "@calcom/features/routing-forms/repositories/PrismaRoutingFormRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { withReporting } from "@calcom/lib/sentryWrapper";
import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import { getUrlSearchParamsToForward } from "./getUrlSearchParamsToForward";

const log = logger.getSubLogger({ prefix: ["[routing-forms]", "[router]"] });
const querySchema = z
  .object({
    form: z.string(),
  })
  .catchall(z.string().or(z.array(z.string())));

const getDeterministicHashForResponse = (fieldsResponses: Record<string, unknown>) => {
  const sortedFields = Object.keys(fieldsResponses)
    .sort()
    .reduce((obj: Record<string, unknown>, key) => {
      obj[key] = fieldsResponses[key];
      return obj;
    }, {});
  const paramsString = JSON.stringify(sortedFields);
  const hash = createHash("sha256").update(paramsString).digest("hex");
  return hash;
};

export function hasEmbedPath(pathWithQuery: string) {
  const onlyPath = pathWithQuery.split("?")[0];
  return onlyPath.endsWith("/embed") || onlyPath.endsWith("/embed/");
}

const _getRoutedUrl = async (context: Pick<GetServerSidePropsContext, "query" | "req">, fetchCrm = true) => {
  const queryParsed = querySchema.safeParse(context.query);
  const isEmbed = hasEmbedPath(context.req.url || "");
  const pageProps = {
    isEmbed,
  };

  if (!queryParsed.success) {
    log.warn("Error parsing query", { issues: queryParsed.error.issues });
    return {
      notFound: true,
    };
  }

  // TODO: Known params reserved by Cal.com are form, embed, layout and other cal. prefixed params. We should exclude all of them from fieldsResponses.
  // But they must be present in `paramsToBeForwardedAsIs` as they could be needed by Booking Page as well.
  const {
    form: formId,
    "cal.isBookingDryRun": isBookingDryRunParam,
    "cal.queueFormResponse": queueFormResponseParam,
    ...fieldsResponses
  } = queryParsed.data;

  const responseHash = getDeterministicHashForResponse(fieldsResponses);

  await checkRateLimitAndThrowError({
    identifier: `form:${formId}:hash:${responseHash}`,
  });

  const isBookingDryRun = isBookingDryRunParam === "true";
  const shouldQueueFormResponse = queueFormResponseParam === "true";
  const paramsToBeForwardedAsIs = {
    ...fieldsResponses,
    // Must be forwarded if present to Booking Page. Setting it explicitly here as it is critical to be present in the URL.
    ...(isBookingDryRunParam ? { "cal.isBookingDryRun": isBookingDryRunParam } : null),
  };

  const { currentOrgDomain } = orgDomainConfig(context.req);

  let timeTaken: Record<string, number | null> = {};

  const formQueryStart = performance.now();
  const form = await PrismaRoutingFormRepository.findFormByIdIncludeUserTeamAndOrg(formId);
  timeTaken.formQuery = performance.now() - formQueryStart;

  if (!form) {
    return {
      notFound: true,
    };
  }

  const profileEnrichmentStart = performance.now();
  const userRepo = new UserRepository(prisma);
  const formWithUserProfile = {
    ...form,
    user: await userRepo.enrichUserWithItsProfile({ user: form.user }),
  };
  timeTaken.profileEnrichment = performance.now() - profileEnrichmentStart;

  if (
    !isAuthorizedToViewFormOnOrgDomain({ user: formWithUserProfile.user, currentOrgDomain, team: form.team })
  ) {
    return {
      notFound: true,
    };
  }

  const getSerializableFormStart = performance.now();
  const serializableForm = await getSerializableForm({
    form: enrichFormWithMigrationData(formWithUserProfile),
  });
  timeTaken.getSerializableForm = performance.now() - getSerializableFormStart;

  if (!serializableForm.fields) {
    throw new Error("Form has no fields");
  }
  const response: FormResponse = getResponseToStore({
    formFields: serializableForm.fields,
    fieldsResponses,
  });

  const matchingRoute = findMatchingRoute({ form: serializableForm, response });
  if (!matchingRoute) {
    throw new Error("No matching route could be found");
  }

  const decidedAction = matchingRoute.action;

  let teamMembersMatchingAttributeLogic = null;
  let formResponseId = null;
  let attributeRoutingConfig = null;
  let crmContactOwnerEmail: string | null = null;
  let crmContactOwnerRecordType: string | null = null;
  let crmAppSlug: string | null = null;
  let queuedFormResponseId;
  try {
    const result = await handleResponse({
      form: serializableForm,
      formFillerId: uuidv4(),
      response: response,
      identifierKeyedResponse: fieldsResponses,
      chosenRouteId: matchingRoute.id,
      isPreview: isBookingDryRun,
      queueFormResponse: shouldQueueFormResponse,
      fetchCrm,
    });
    teamMembersMatchingAttributeLogic = result.teamMembersMatchingAttributeLogic;
    formResponseId = result.formResponse?.id;
    queuedFormResponseId = result.queuedFormResponse?.id;
    attributeRoutingConfig = result.attributeRoutingConfig;
    timeTaken = {
      ...timeTaken,
      ...result.timeTaken,
    };
    crmContactOwnerEmail = result.crmContactOwnerEmail;
    crmContactOwnerRecordType = result.crmContactOwnerRecordType;
    crmAppSlug = result.crmAppSlug;
  } catch (e) {
    if (e instanceof HttpError || e instanceof TRPCError) {
      return {
        props: {
          ...pageProps,
          form: serializableForm,
          message: null,
          errorMessage: e.message,
        },
      };
    }

    log.error("Error handling the response", safeStringify(e));
    throw new Error("Error handling the response");
  }

  // TODO: To be done using sentry tracing
  console.log("Server-Timing", getServerTimingHeader(timeTaken));

  //TODO: Maybe take action after successful mutation
  if (decidedAction.type === "customPageMessage") {
    return {
      props: {
        ...pageProps,
        form: serializableForm,
        message: decidedAction.value,
        errorMessage: null,
      },
    };
  } else if (decidedAction.type === "eventTypeRedirectUrl") {
    const eventTypeUrlWithResolvedVariables = substituteVariables(
      decidedAction.value,
      response,
      serializableForm.fields
    );
    return {
      redirect: {
        destination: getAbsoluteEventTypeRedirectUrlWithEmbedSupport({
          eventTypeRedirectUrl: eventTypeUrlWithResolvedVariables,
          form: serializableForm,
          allURLSearchParams: getUrlSearchParamsToForward({
            formResponse: response,
            fields: serializableForm.fields,
            searchParams: new URLSearchParams(
              stringify({ ...paramsToBeForwardedAsIs, "cal.action": "eventTypeRedirectUrl" })
            ),
            teamMembersMatchingAttributeLogic,
            formResponseId: formResponseId ?? null,
            queuedFormResponseId: queuedFormResponseId ?? null,
            attributeRoutingConfig: attributeRoutingConfig ?? null,
            teamId: form?.teamId,
            orgId: form.team?.parentId,
            crmContactOwnerEmail,
            crmContactOwnerRecordType,
            crmAppSlug,
          }),
          isEmbed: pageProps.isEmbed,
        }),
        permanent: false,
      },
    };
  } else if (decidedAction.type === "externalRedirectUrl") {
    return {
      redirect: {
        destination: `${decidedAction.value}?${stringify(context.query)}&cal.action=externalRedirectUrl`,
        permanent: false,
      },
    };
  }

  // TODO: Consider throwing error here as there is no value of decidedAction.type that would cause the flow to be here
  return {
    props: {
      ...pageProps,
      form: serializableForm,
      message: null,
      errorMessage: "Unhandled type of action",
    },
  };
};

export const getRoutedUrl = withReporting(_getRoutedUrl, "getRoutedUrl");
