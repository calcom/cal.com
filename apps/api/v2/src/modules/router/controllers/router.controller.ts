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
      return this.handleRedirect(routedUrlData.redirect.destination);
    }

    if (routedUrlData?.props) {
      return { status: "success", data: { message: routedUrlData.props.message ?? "" }, redirect: false };
    }

    return { status: "success", data: { message: "No Route nor custom message found." }, redirect: false };
  }

  private async handleRedirect(destination: string): Promise<ApiResponse<unknown> & { redirect: boolean }> {
    const routingUrl = new URL(destination);
    const routingSearchParams = routingUrl.searchParams;
    if (
      routingSearchParams.get("cal.action") === "eventTypeRedirectUrl" &&
      routingSearchParams.has("email") &&
      routingSearchParams.has("cal.teamId") &&
      !routingSearchParams.has("cal.skipContactOwner")
    ) {
      return this.handleRedirectWithContactOwner(routingUrl, routingSearchParams);
    }

    return { status: "success", data: destination, redirect: true };
  }

  private async handleRedirectWithContactOwner(
    routingUrl: URL,
    routingSearchParams: URLSearchParams
  ): Promise<ApiResponse<unknown> & { redirect: boolean }> {
    const pathNameParams = routingUrl.pathname.split("/");
    const eventTypeSlug = pathNameParams[pathNameParams.length - 1];
    const teamId = Number(routingSearchParams.get("cal.teamId"));
    const eventTypeData = await this.teamsEventTypesRepository.getTeamEventTypeBySlug(
      teamId,
      eventTypeSlug,
      3
    );

    // get the salesforce record owner email for the email given as a form response.
    const {
      email: teamMemberEmail,
      recordType: crmOwnerRecordType,
      crmAppSlug,
    } = await getTeamMemberEmailForResponseOrContactUsingUrlQuery({
      query: Object.fromEntries(routingSearchParams),
      eventData: eventTypeData,
    });

    Boolean(teamMemberEmail) && routingUrl.searchParams.set("cal.teamMemberEmail", teamMemberEmail);
    Boolean(crmOwnerRecordType) && routingUrl.searchParams.set("cal.crmOwnerRecordType", crmOwnerRecordType);
    Boolean(crmAppSlug) && routingUrl.searchParams.set("cal.crmAppSlug", crmAppSlug);

    return { status: "success", data: routingUrl.toString(), redirect: true };
  }
}
