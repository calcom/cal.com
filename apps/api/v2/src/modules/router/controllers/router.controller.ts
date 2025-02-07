import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { TeamsEventTypesRepository } from "@/modules/teams/event-types/teams-event-types.repository";
import { Controller, Req, NotFoundException, Param, Post, Body } from "@nestjs/common";
import { ApiTags as DocsTags, ApiExcludeController as DocsExcludeController } from "@nestjs/swagger";
import { Request } from "express";

import {
  getRoutedUrl,
  getTeamMemberEmailForResponseOrContactUsingUrlQuery,
} from "@calcom/platform-libraries";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "/v2/router",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Router controller")
@DocsExcludeController(true)
export class RouterController {
  constructor(private readonly teamsEventTypesRepository: TeamsEventTypesRepository) {}

  @Post("/forms/:formId/submit")
  async getRoutingFormResponse(
    @Req() request: Request,
    @Param("formId") formId: string,
    @Body() body?: Record<string, string>
  ): Promise<void | (ApiResponse<unknown> & { redirect: boolean })> {
    const params = Object.fromEntries(new URLSearchParams(body ?? {}));
    const routedUrlData = await getRoutedUrl({ req: request, query: { ...params, form: formId } });

    if (routedUrlData?.notFound) {
      throw new NotFoundException("Route not found. Please check the provided form parameter.");
    }

    if (routedUrlData?.redirect?.destination) {
      const routingUrl = new URL(routedUrlData?.redirect?.destination);
      const routingSearchParams = routingUrl.searchParams;
      if (
        routingSearchParams.get("cal.action") === "eventTypeRedirectUrl" &&
        Boolean(routingSearchParams.get("email")) &&
        Boolean(routingSearchParams.get("cal.orgId")) &&
        Boolean(routingSearchParams.get("cal.teamId"))
      ) {
        const pathNameParams = routingUrl.pathname.split("/");
        const eventTypeSlug = pathNameParams[pathNameParams.length - 1];
        const eventTypeData = this.teamsEventTypesRepository.getTeamEventTypeBySlug(
          Number(routingSearchParams.get("teamId")),
          eventTypeSlug
        );

        // get salesforce related data
        const {
          email: teamMemberEmail,
          recordType: crmOwnerRecordType,
          crmAppSlug,
        } = await getTeamMemberEmailForResponseOrContactUsingUrlQuery({
          query: Object.fromEntries(routingSearchParams),
          eventTypeData,
        });
        routingUrl.searchParams.set("cal.teamMemberEmail", teamMemberEmail);
        routingUrl.searchParams.set("cal.crmOwnerRecordType", crmOwnerRecordType);
        routingUrl.searchParams.set("cal.crmAppSlug", crmAppSlug);
        return { status: "success", data: routingUrl.toString(), redirect: true };
      }

      return { status: "success", data: routedUrlData.redirect.destination, redirect: true };
    }

    if (routedUrlData?.props) {
      return { status: "success", data: { message: routedUrlData?.props?.message ?? "" }, redirect: false };
    }

    return { status: "success", data: { message: "No Route nor custom message found." }, redirect: false };
  }
}
