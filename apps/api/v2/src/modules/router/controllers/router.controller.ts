import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { Controller, Get, Req, NotFoundException, Res, Query } from "@nestjs/common";
import { ApiTags as DocsTags, ApiExcludeController as DocsExcludeController } from "@nestjs/swagger";
import { Request, Response } from "express";
import z from "zod";

import { getRoutedUrl } from "@calcom/platform-libraries-1.2.3";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "/v2/router",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Routing forms")
@DocsExcludeController(true)
export class RouterController {
  @Get("/")
  async getRouterResponse(
    @Req() request: Request,
    @Res() res: Response,
    @Query() query: Record<string, string>
  ): Promise<void | ApiResponse<unknown>> {
    const routedUrlData = await getRoutedUrl({ req: request, query });

    if (routedUrlData?.notFound) {
      throw new NotFoundException("Route not found. Please check the provided form parameter.");
    }

    if (routedUrlData?.redirect?.destination) {
      return res.redirect(307, routedUrlData.redirect.destination);
    }

    if (routedUrlData?.props) {
      return { status: "success", data: routedUrlData.props };
    }

    return { status: "success", data: "route nor custom message found" };
  }
}
