import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { NextAuthGuard } from "@/modules/auth/guards/next-auth/next-auth.guard";
import { RoutingRepository } from "@/modules/router/router.repository";
import { RouterService } from "@/modules/router/services/router.service";
import {
  Controller,
  Get,
  UseGuards,
  Req,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";
import { Request } from "express";
import { stringify } from "querystring";
import z from "zod";

import {
  orgDomainConfig,
  UserRepository,
  isAuthorizedToViewFormOnOrgDomain,
  enrichFormWithMigrationData,
  getSerializableForm,
  getFieldIdentifier,
  getFieldResponseForJsonLogic,
  findMatchingRoute,
  handleResponse,
  getServerTimingHeader,
  substituteVariables,
} from "@calcom/platform-libraries-1.2.3";
import type { FormResponse } from "@calcom/platform-libraries-1.2.3";
import { ApiResponse } from "@calcom/platform-types";

const querySchema = z
  .object({
    form: z.string(),
  })
  .catchall(z.string().or(z.array(z.string())));

@Controller({
  path: "/v2/router",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Destination Calendars")
export class RouterController {
  private logger = new Logger("Routing Controller");

  constructor(
    private readonly routerService: RouterService,
    private readonly routerRepository: RoutingRepository
  ) {}

  @Get("/")
  @UseGuards(NextAuthGuard)
  async getRouterResponse(@Req() request: Request): Promise<ApiResponse<unknown>> {
    const queryParsed = querySchema.safeParse(request.query);
    const isEmbed = this.routerService.hasEmbedPath(request.url || "");
    const pageProps = {
      isEmbed,
    };

    if (!queryParsed.success) {
      this.logger.log("Error parsing query", queryParsed.error);
      throw new NotFoundException("Error parsing query");
    }

    // Known params reserved by Cal.com are form, embed, layout. We should exclude all of them.
    const { form: formId, ...fieldsResponses } = queryParsed.data;
    const { currentOrgDomain } = orgDomainConfig(request);

    let timeTaken: Record<string, number | null> = {};

    const formQueryStart = performance.now();
    const form = await this.routerRepository.findFormByIdIncludeUserTeamAndOrg(formId);
    timeTaken.formQuery = performance.now() - formQueryStart;

    if (!form) {
      throw new NotFoundException();
    }

    const profileEnrichmentStart = performance.now();
    // maybe its better to import UserRepository from platform libraries instead of setting up one in v2
    const formWithUserProfile = {
      ...form,
      user: await UserRepository.enrichUserWithItsProfile({ user: form.user }),
    };
    timeTaken.profileEnrichment = performance.now() - profileEnrichmentStart;

    if (
      !isAuthorizedToViewFormOnOrgDomain({
        user: formWithUserProfile.user,
        currentOrgDomain,
        team: form.team,
      })
    ) {
      throw new NotFoundException();
    }

    const getSerializableFormStart = performance.now();
    const serializableForm = await getSerializableForm({
      form: enrichFormWithMigrationData(formWithUserProfile),
    });
    timeTaken.getSerializableForm = performance.now() - getSerializableFormStart;

    const response: FormResponse = {};
    if (!serializableForm.fields) {
      throw new BadRequestException("Form has no fields");
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
      throw new NotFoundException("No matching route could be found");
    }

    const decidedAction = matchingRoute.action;

    const { v4: uuidv4 } = await import("uuid");
    let teamMembersMatchingAttributeLogic = null;
    let formResponseId = null;
    let attributeRoutingConfig = null;
    try {
      const result = await handleResponse({
        form: serializableForm,
        formFillerId: uuidv4(),
        response: response,
        chosenRouteId: matchingRoute.id,
      });
      teamMembersMatchingAttributeLogic = result.teamMembersMatchingAttributeLogic;
      formResponseId = result.formResponse.id;
      attributeRoutingConfig = result.attributeRoutingConfig;
      timeTaken = {
        ...timeTaken,
        ...result.timeTaken,
      };
    } catch (error) {
      this.logger.error(error);
    }

    // TODO: To be done using sentry tracing
    this.logger.log("Server-Timing", getServerTimingHeader(timeTaken));

    // TODO: Maybe take action after successful mutation
    if (decidedAction.type === "customPageMessage") {
      return {
        status: "success",
        data: {
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
        status: "success",
        data: {
          //   redirect: {
          //     destination: getAbsoluteEventTypeRedirectUrlWithEmbedSupport({
          //       eventTypeRedirectUrl: eventTypeUrlWithResolvedVariables,
          //       form: serializableForm,
          //       allURLSearchParams: getUrlSearchParamsToForward({
          //         formResponse: response,
          //         fields: serializableForm.fields,
          //         searchParams: new URLSearchParams(stringify(fieldsResponses)),
          //         teamMembersMatchingAttributeLogic,
          //         // formResponseId is guaranteed to be set because in catch block of trpc request we return from the function and otherwise it would have been set
          //         formResponseId: formResponseId!,
          //         attributeRoutingConfig: attributeRoutingConfig ?? null,
          //       }),
          //       isEmbed: pageProps.isEmbed,
          //     }),
          //   },
        },
      };
    } else if (decidedAction.type === "externalRedirectUrl") {
      return {
        status: "success",
        data: {
          redirect: {
            // destination: `${decidedAction.value}?${stringify(request.query)}`,
          },
        },
      };
    }

    return {
      status: "success",
      data: {
        ...pageProps,
        form: serializableForm,
        message: "Unhandled type of action",
      },
    };
  }
}
