import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { RoutingRepository } from "@/modules/router/router.repository";
import { RouterService } from "@/modules/router/services/router.service";
import {
  Controller,
  Get,
  Req,
  Logger,
  NotFoundException,
  BadRequestException,
  Res,
  Query,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";
import { Request, Response } from "express";
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
@DocsTags("Routing forms")
export class RouterController {
  private logger = new Logger("Routing Controller");

  constructor(
    private readonly routerService: RouterService,
    private readonly routerRepository: RoutingRepository
  ) {}

  @Get("/")
  async getRouterResponse(
    @Req() request: Request,
    @Res() res: Response,
    @Query() query: Record<string, string>
  ): Promise<void | ApiResponse<{
    isEmbed: boolean;
    message: string;
    form: Awaited<ReturnType<typeof getSerializableForm>>;
  }>> {
    const queryParsed = querySchema.safeParse(request.query);
    const isEmbed = this.routerService.hasEmbedPath(request.url || "");

    if (!queryParsed.success) {
      this.logger.log("Error parsing query", queryParsed.error);
      throw new NotFoundException("Error parsing query parameters");
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
    const form = await this.routerRepository.findFormByIdIncludeUserTeamAndOrg(formId);
    const teamId = form?.teamId;
    const orgId = form?.team?.parentId;

    if (!form) {
      throw new NotFoundException("Could not find this form.");
    }

    const formWithUserProfile = {
      ...form,
      user: await UserRepository.enrichUserWithItsProfile({ user: form.user }),
    };

    if (
      !isAuthorizedToViewFormOnOrgDomain({
        user: formWithUserProfile.user,
        currentOrgDomain,
        team: form.team,
      })
    ) {
      throw new UnauthorizedException("Unauthorized Domain.");
    }

    const serializableForm = await getSerializableForm({
      form: enrichFormWithMigrationData(formWithUserProfile),
    });

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
      throw new NotFoundException("No matching route configured for this form could be found.");
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
    } catch (error) {
      throw new BadRequestException("Could not process form response.");
    }

    if (decidedAction.type === "customPageMessage") {
      return {
        status: "success",
        data: {
          isEmbed,
          form: serializableForm,
          message: decidedAction.value,
        },
      };
    }

    if (decidedAction.type === "eventTypeRedirectUrl") {
      const eventTypeUrlWithResolvedVariables = substituteVariables(
        decidedAction.value,
        response,
        serializableForm.fields
      );

      return res.redirect(
        307,
        getAbsoluteEventTypeRedirectUrlWithEmbedSupport({
          eventTypeRedirectUrl: eventTypeUrlWithResolvedVariables,
          form: serializableForm,
          allURLSearchParams: getUrlSearchParamsToForward({
            formResponse: response,
            fields: serializableForm.fields,
            searchParams: new URLSearchParams(stringify(paramsToBeForwardedAsIs)),
            teamMembersMatchingAttributeLogic,
            formResponseId,
            attributeRoutingConfig: attributeRoutingConfig ?? null,
            teamId,
            orgId,
          }),
          isEmbed,
        })
      );
    }

    if (decidedAction.type === "externalRedirectUrl") {
      return res.redirect(307, `${decidedAction.value}?${stringify(query)}`);
    }

    return {
      status: "success",
      data: {
        form: serializableForm,
        message: "Unhandled type of action",
        isEmbed,
      },
    };
  }
}
