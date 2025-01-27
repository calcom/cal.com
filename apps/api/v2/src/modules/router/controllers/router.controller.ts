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
  getAbsoluteEventTypeRedirectUrlWithEmbedSupport,
  getUrlSearchParamsToForward,
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

    // TODO(hariom): Known params reserved by Cal.com are form, embed, layout and other cal. prefixed params. We should exclude all of them from fieldsResponses.
    // But they must be present in `paramsToBeForwardedAsIs` as they could be needed by Booking Page as well.
    const {
      form: formId,
      "cal.isBookingDryRun": isBookingDryRunParam,
      ...fieldsResponses
    } = queryParsed.data;
    const isBookingDryRun = isBookingDryRunParam === "true";
    const paramsToBeForwardedAsIs = {
      ...fieldsResponses,
      // Must be forwarded if present to Booking Page. Setting it explicitly here as it is critical to be present in the URL.
      ...(isBookingDryRunParam ? { "cal.isBookingDryRun": isBookingDryRunParam } : null),
    };

    const { currentOrgDomain } = orgDomainConfig(request);

    let timeTaken: Record<string, number | null> = {};

    const formQueryStart = performance.now();
    const form = await this.routerRepository.findFormByIdIncludeUserTeamAndOrg(formId);
    timeTaken.formQuery = performance.now() - formQueryStart;

    if (!form) {
      throw new NotFoundException();
    }

    const profileEnrichmentStart = performance.now();
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
        isPreview: isBookingDryRun,
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
      // should we throw an error here or should we return object with error message just like how its done in getServerSideProps for webapp?
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
          redirectDestination: getAbsoluteEventTypeRedirectUrlWithEmbedSupport({
            eventTypeRedirectUrl: eventTypeUrlWithResolvedVariables,
            form: serializableForm,
            // bit doubtful regardng this getUrlSearchParamsToForward
            // might have to double check again
            allURLSearchParams: getUrlSearchParamsToForward({
              formResponse: response,
              fields: serializableForm.fields,
              searchParams: new URLSearchParams(stringify(paramsToBeForwardedAsIs)),
              teamMembersMatchingAttributeLogic,
              // formResponseId is guaranteed to be set because in catch block of trpc request we return from the function and otherwise it would have been set
              formResponseId: formResponseId!,
              attributeRoutingConfig: attributeRoutingConfig ?? null,
            }),
            isEmbed: pageProps.isEmbed,
          }),
          isEmbed: pageProps.isEmbed,
        },
      };
    } else if (decidedAction.type === "externalRedirectUrl") {
      return {
        status: "success",
        data: {
          redirectDestination: `${decidedAction.value}?${stringify(request.query)}`,
        },
      };
    }

    // TODO (hariom): Consider throwing error here as there is no value of decidedAction.type that would cause the flow to be here
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
