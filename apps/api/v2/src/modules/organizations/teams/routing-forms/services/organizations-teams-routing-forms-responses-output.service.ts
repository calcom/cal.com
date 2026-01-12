import { Injectable } from "@nestjs/common";
import { plainToClass } from "class-transformer";

import { RoutingFormResponseOutput, RoutingFormResponseResponseOutput } from "@calcom/platform-types";
import type { App_RoutingForms_FormResponse } from "@calcom/prisma/client";

@Injectable()
export class OrganizationsTeamsRoutingFormsResponsesOutputService {
  getRoutingFormResponses(
    dbRoutingFormResponses: App_RoutingForms_FormResponse[]
  ): RoutingFormResponseOutput[] {
    return dbRoutingFormResponses.map((response) => {
      const parsed = plainToClass(RoutingFormResponseOutput, response, { strategy: "excludeAll" });

      // note(Lauris): I don't know why plainToClass(RoutingFormResponseOutput)
      // erases nested "response" object so parsing and attaching it manually
      const parsedResponse: Record<string, RoutingFormResponseResponseOutput> = {};
      const responseData = response.response || {};
      for (const [key, value] of Object.entries(responseData)) {
        parsedResponse[key] = plainToClass(RoutingFormResponseResponseOutput, value, {
          strategy: "excludeAll",
        });
      }

      return {
        ...parsed,
        response: parsedResponse,
      };
    });
  }
}
