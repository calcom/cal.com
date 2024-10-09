import { stringify } from "querystring";
import z from "zod";

import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import logger from "@calcom/lib/logger";
import { TRPCError } from "@calcom/trpc/server";
import type { AppGetServerSidePropsContext, AppPrisma } from "@calcom/types/AppGetServerSideProps";

import { enrichFormWithMigrationData } from "../../enrichFormWithMigrationData";
import { getAbsoluteEventTypeRedirectUrlWithEmbedSupport } from "../../getEventTypeRedirectUrl";
import getFieldIdentifier from "../../lib/getFieldIdentifier";
import { getSerializableForm } from "../../lib/getSerializableForm";
import { findMatchingRoute } from "../../lib/processRoute";
import { substituteVariables } from "../../lib/substituteVariables";
import { getFieldResponseForJsonLogic } from "../../lib/transformResponse";
import type { FormResponse } from "../../types/types";
import { isAuthorizedToViewTheForm } from "../routing-link/getServerSideProps";
import { getUrlSearchParamsToForward } from "../routing-link/getUrlSearchParamsToForward";

const log = logger.getSubLogger({ prefix: ["[routing-forms]", "[router]"] });

const querySchema = z
  .object({
    form: z.string(),
    slug: z.string(),
    pages: z.array(z.string()),
  })
  .catchall(z.string().or(z.array(z.string())));

function getNamedParams(params: { appPages: string[] } | undefined) {
  const [embed] = params?.appPages || [];
  return {
    // There might not be item at index 0, so explicit assertion is needed
    embed: embed as typeof embed | undefined,
  };
}

export const getServerSideProps = async function getServerSideProps(
  context: AppGetServerSidePropsContext,
  prisma: AppPrisma
) {
  const queryParsed = querySchema.safeParse(context.query);
  const { embed } = getNamedParams(context.params);
  const pageProps = {
    isEmbed: !!embed,
  };

  if (!queryParsed.success) {
    log.warn("Error parsing query", queryParsed.error);
    return {
      notFound: true,
    };
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { form: formId, slug: _slug, pages: _pages, ...fieldsResponses } = queryParsed.data;
  const { currentOrgDomain } = orgDomainConfig(context.req);

  const form = await prisma.app_RoutingForms_Form.findFirst({
    where: {
      id: formId,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          movedToProfileId: true,
          metadata: true,
          organization: {
            select: {
              slug: true,
            },
          },
        },
      },
      team: {
        select: {
          parentId: true,
          parent: {
            select: {
              slug: true,
            },
          },
          slug: true,
          metadata: true,
        },
      },
    },
  });

  if (!form) {
    return {
      notFound: true,
    };
  }

  const { UserRepository } = await import("@calcom/lib/server/repository/user");
  const formWithUserProfile = {
    ...form,
    user: await UserRepository.enrichUserWithItsProfile({ user: form.user }),
  };

  if (!(await isAuthorizedToViewTheForm({ user: formWithUserProfile.user, currentOrgDomain }))) {
    return {
      notFound: true,
    };
  }

  const serializableForm = await getSerializableForm({
    form: enrichFormWithMigrationData(formWithUserProfile),
  });

  const response: FormResponse = {};
  if (!serializableForm.fields) {
    throw new Error("Form has no fields");
  }
  serializableForm.fields.forEach((field) => {
    const fieldResponse = fieldsResponses[getFieldIdentifier(field)] || "";

    response[field.id] = {
      label: field.label,
      value: getFieldResponseForJsonLogic({ field, value: fieldResponse }),
    };
  });

  const matchingRoute = findMatchingRoute({ form: serializableForm, response });

  if (!matchingRoute) {
    throw new Error("No matching route could be found");
  }

  const decidedAction = matchingRoute.action;

  const { createContext } = await import("@calcom/trpc/server/createContext");
  const ctx = await createContext(context);

  const { default: trpcRouter } = await import("@calcom/app-store/routing-forms/trpc/_router");
  const caller = trpcRouter.createCaller(ctx);
  const { v4: uuidv4 } = await import("uuid");
  let teamMembersMatchingAttributeLogic = null;
  let formResponseId = null;
  let attributeRoutingConfig = null;
  try {
    const result = await caller.public.response({
      formId: form.id,
      formFillerId: uuidv4(),
      response: response,
      chosenRouteId: matchingRoute.id,
    });
    teamMembersMatchingAttributeLogic = result.teamMembersMatchingAttributeLogic;
    formResponseId = result.formResponse.id;
    attributeRoutingConfig = result.attributeRoutingConfig;
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
            searchParams: new URLSearchParams(stringify(fieldsResponses)),
            teamMembersMatchingAttributeLogic,
            // formResponseId is guaranteed to be set because in catch block of trpc request we return from the function and otherwise it would have been set
            formResponseId: formResponseId!,
            attributeRoutingConfig: attributeRoutingConfig ?? null,
          }),
          isEmbed: pageProps.isEmbed,
        }),
        permanent: false,
      },
    };
  } else if (decidedAction.type === "externalRedirectUrl") {
    return {
      redirect: {
        destination: `${decidedAction.value}?${stringify(context.query)}`,
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
