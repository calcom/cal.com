import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { Controller, Req, NotFoundException, Param, Post, Body } from "@nestjs/common";
import { ApiTags as DocsTags, ApiExcludeController as DocsExcludeController } from "@nestjs/swagger";
import { Request } from "express";

import { getRoutedUrl } from "@calcom/platform-libraries";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "/v2/router",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Router controller")
@DocsExcludeController(true)
export class RouterController {
  @Post("/forms/:formId/submit")
  async getRoutingFormResponse(
    @Req() request: Request,
    @Param("formId") formId: string,
    @Body() body?: Record<string, string>
  ): Promise<void | (ApiResponse<unknown> & { redirect: boolean })> {
    const params = Object.fromEntries(new URLSearchParams(body ?? {}));
    console.log("PARAMS", params);
    const routedUrlData = await getRoutedUrl({ req: request, query: { ...params, form: formId } });

    if (routedUrlData?.notFound) {
      throw new NotFoundException("Route not found. Please check the provided form parameter.");
    }

    if (routedUrlData?.redirect?.destination) {
      return { status: "success", data: routedUrlData?.redirect?.destination, redirect: true };
    }

    if (routedUrlData?.props) {
      return { status: "success", data: { message: routedUrlData?.props?.message ?? "" }, redirect: false };
    }

    return { status: "success", data: { message: "No Route nor custom message found." }, redirect: false };
  }
}
