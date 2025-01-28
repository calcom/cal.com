import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { Controller, Get, Req, NotFoundException, Res, Query, Param } from "@nestjs/common";
import { ApiTags as DocsTags, ApiExcludeController as DocsExcludeController } from "@nestjs/swagger";
import { Request, Response } from "express";

import { getRoutedUrl } from "@calcom/platform-libraries";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "/v2/router",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Router controller")
@DocsExcludeController(true)
export class RouterController {
  @Get("/forms/:formId")
  async getRoutingFormResponse(
    @Req() request: Request,
    @Res() res: Response,
    @Param("formId") formId: string,
    @Query() query: Record<string, string>
  ): Promise<void | (ApiResponse<unknown> & { redirect?: string })> {
    const routedUrlData = await getRoutedUrl({ req: request, query: { ...query, form: formId } });

    if (routedUrlData?.notFound) {
      throw new NotFoundException("Route not found. Please check the provided form parameter.");
    }

    if (routedUrlData?.redirect?.destination) {
      return { status: "success", data: "redirect", redirect: routedUrlData?.redirect?.destination };
    }

    if (routedUrlData?.props) {
      return { status: "success", data: routedUrlData.props };
    }

    return { status: "success", data: "route nor custom message found" };
  }
}
