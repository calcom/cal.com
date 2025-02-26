// !IMPORTANT! changes to this file requires publishing new version of platform libraries in order for the changes to be applied to APIV2
import type { GetServerSidePropsContext } from "next";
import { stringify } from "querystring";
import z from "zod";

import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { isAuthorizedToViewFormOnOrgDomain } from "@calcom/features/routing-forms/lib/isAuthorizedToViewForm";
import logger from "@calcom/lib/logger";
import { RoutingFormRepository } from "@calcom/lib/server/repository/routingForm";
import { TRPCError } from "@calcom/trpc/server";

const log = logger.getSubLogger({ prefix: ["[routing-forms]", "[router]"] });
const querySchema = z
  .object({
    form: z.string(),
  })
  .catchall(z.string().or(z.array(z.string())));

function hasEmbedPath(pathWithQuery: string) {
  const onlyPath = pathWithQuery.split("?")[0];
  return onlyPath.endsWith("/embed") || onlyPath.endsWith("/embed/");
}

async function getRoutingFormModules() {
  // Dynamically import modules that might contain client components
  const { enrichFormWithMigrationData } = await import(
    "@calcom/app-store/routing-forms/enrichFormWithMigrationData"
  );
  const { getAbsoluteEventTypeRedirectUrlWithEmbedSupport } = await import(
    "@calcom/app-store/routing-forms/getEventTypeRedirectUrl"
  );
  const getFieldIdentifier = (await import("@calcom/app-store/routing-forms/lib/getFieldIdentifier")).default;
  const { getSerializableForm } = await import("@calcom/app-store/routing-forms/lib/getSerializableForm");
  const { getServerTimingHeader } = await import("@calcom/app-store/routing-forms/lib/getServerTimingHeader");
  const { handleResponse } = await import("@calcom/app-store/routing-forms/lib/handleResponse");
  const { findMatchingRoute } = await import("@calcom/app-store/routing-forms/lib/processRoute");
  const { substituteVariables } = await import("@calcom/app-store/routing-forms/lib/substituteVariables");
  const { getFieldResponseForJsonLogic } = await import(
    "@calcom/app-store/routing-forms/lib/transformResponse"
  );
  const { getUrlSearchParamsToForward } = await import(
    "@calcom/app-store/routing-forms/pages/routing-link/getUrlSearchParamsToForward"
  );

  return {
    enrichFormWithMigrationData,
    getAbsoluteEventTypeRedirectUrlWithEmbedSupport,
    getFieldIdentifier,
    getSerializableForm,
    getServerTimingHeader,
    handleResponse,
    findMatchingRoute,
    substituteVariables,
    getFieldResponseForJsonLogic,
    getUrlSearchParamsToForward,
  };
}

export const getRoutedUrl = async (context: Pick<GetServerSidePropsContext, "query" | "req">) => {
  const queryParsed = querySchema.safeParse(context.query);
  const isEmbed = hasEmbedPath(context.req.url || "");
  const pageProps = {
    isEmbed,
  };

  if (!queryParsed.success) {
    log.warn("Error parsing query", queryParsed.error);
    return {
      notFound: true,
    };
  }

  // Dynamically import modules that might contain client components
  const routingModules = await getRoutingFormModules();

  // TODO: Known params reserved by Cal.com are form, embed, layout and other cal. prefixed params. We should exclude all of them from fieldsResponses.
  // But they must be present in `paramsToBeForwardedAsIs` as they could be needed by Booking Page as well.
  const { form: formId, "cal.isBookingDryRun": isBookingDryRunParam, ...fieldsResponses } = queryParsed.data;
  const isBookingDryRun = isBookingDryRunParam === "true";
  const paramsToBeForwardedAsIs = {
    ...fieldsResponses,
    // Must be forwarded if present to Booking Page. Setting it explicitly here as it is critical to be present in the URL.
    ...(isBookingDryRunParam ? { "cal.isBookingDryRun": isBookingDryRunParam } : null),
  };

  const { currentOrgDomain } = orgDomainConfig(context.req);

  let timeTaken: Record<string, number | null> = {};

  const formQueryStart = performance.now();
  const form = await RoutingFormRepository.findFormByIdIncludeUserTeamAndOrg(formId);
  timeTaken.formQuery = performance.now() - formQueryStart;

  if (!form) {
    return {
      notFound: true,
    };
  }

  const { UserRepository } = await import("@calcom/lib/server/repository/user");
  const profileEnrichmentStart = performance.now();
  const formWithUserProfile = {
    ...form,
    user: await UserRepository.enrichUserWithItsProfile({ user: form.user }),
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
  const serializableForm = await routingModules.getSerializableForm({
    form: routingModules.enrichFormWithMigrationData(formWithUserProfile),
  });
  timeTaken.getSerializableForm = performance.now() - getSerializableFormStart;

  const response: any = {}; // Using any here to avoid importing FormResponse type
  if (!serializableForm.fields) {
    throw new Error("Form has no fields");
  }
  serializableForm.fields.forEach((field) => {
    const fieldResponse = fieldsResponses[routingModules.getFieldIdentifier(field)] || "";

    response[field.id] = {
      label: field.label,
      value: routingModules.getFieldResponseForJsonLogic({ field, value: fieldResponse }),
    };
  });

  const matchingRoute = routingModules.findMatchingRoute({ form: serializableForm, response });

  if (!matchingRoute) {
    throw new Error("No matching route could be found");
  }

  const decidedAction = matchingRoute.action;

  const { v4: uuidv4 } = await import("uuid");
  let teamMembersMatchingAttributeLogic = null;
  let formResponseId = null;
  let attributeRoutingConfig = null;
  try {
    const result = await routingModules.handleResponse({
      form: serializableForm,
      formFillerId: uuidv4(),
      response: response,
      chosenRouteId: matchingRoute.id,
      isPreview: isBookingDryRun,
    });
    teamMembersMatchingAttributeLogic = result.teamMembersMatchingAttributeLogic;
    formResponseId = result.formResponse.id;
    attributeRoutingConfig = result.attributeRoutingConfig;
    timeTaken = {
      ...timeTaken,
      ...result.timeTaken,
    };
  } catch (e) {
    if (e instanceof TRPCError) {
      return {
        props: {
          ...pageProps,
          form: serializableForm,
          message: e.message,
        },
      };
    }
  }

  // TODO: To be done using sentry tracing
  console.log("Server-Timing", routingModules.getServerTimingHeader(timeTaken));

  //TODO: Maybe take action after successful mutation
  if (decidedAction.type === "customPageMessage") {
    return {
      props: {
        ...pageProps,
        form: serializableForm,
        message: decidedAction.value,
      },
    };
  } else if (decidedAction.type === "eventTypeRedirectUrl") {
    const eventTypeUrlWithResolvedVariables = routingModules.substituteVariables(
      decidedAction.value,
      response,
      serializableForm.fields
    );

    return {
      redirect: {
        destination: routingModules.getAbsoluteEventTypeRedirectUrlWithEmbedSupport({
          eventTypeRedirectUrl: eventTypeUrlWithResolvedVariables,
          form: serializableForm,
          allURLSearchParams: routingModules.getUrlSearchParamsToForward({
            formResponse: response,
            fields: serializableForm.fields,
            searchParams: new URLSearchParams(
              stringify({ ...paramsToBeForwardedAsIs, "cal.action": "eventTypeRedirectUrl" })
            ),
            teamMembersMatchingAttributeLogic,
            // formResponseId is guaranteed to be set because in catch block of trpc request we return from the function and otherwise it would have been set
            formResponseId: formResponseId!,
            attributeRoutingConfig: attributeRoutingConfig ?? null,
            teamId: form?.teamId,
            orgId: form.team?.parentId,
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
      message: "Unhandled type of action",
    },
  };
};
