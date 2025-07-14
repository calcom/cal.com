import { zodNonRouterField } from "@calcom/app-store/routing-forms/zod";
import { routingFormResponseInDbSchema } from "@calcom/app-store/routing-forms/zod";
import type logger from "@calcom/lib/logger";

import type { RoutingFormResponseRepositoryInterface } from "../../repository/RoutingFormResponseRepository.interface";
import type { RoutingFormResponseData } from "./responseData/types";

interface Dependencies {
  logger: typeof logger;
  routingFormResponseRepo: RoutingFormResponseRepositoryInterface;
}

export class RoutingFormResponseDataFactory {
  constructor(private readonly deps: Dependencies) {}

  async createWithBookingId(bookingId: string) {
    const log = this.deps.logger.getSubLogger({
      prefix: ["[routingFormFieldService]", { bookingUid }],
    });

    const formResponse = await this.deps.routingFormResponseRepo.findByBookingUid(bookingId);

    if (!formResponse) {
      log.error("Form response not found");
      throw new Error("Form response not found");
    }

    return this.parseResponseData(formResponse.response);
  }

  async createWithResponseId(responseId: number) {
    const log = this.deps.logger.getSubLogger({
      prefix: ["[routingFormFieldService]", { responseId }],
    });

    const formResponse = await this.deps.routingFormResponseRepo.findByResponseId(responseId);

    if (!formResponse) {
      log.error("Form response not found");
      throw new Error("Form response not found");
    }

    return this.parseResponseData(formResponse.response);
  }

  private parseResponseData(rawResponse: string): RoutingFormResponseData {
    const response = routingFormResponseInDbSchema.safeParse(rawResponse);
    if (!response.success) {
      log.error("Form response not found");
      throw new Error("Form response not found");
    }

    const fields = zodNonRouterField.array().safeParse(formResponse.form.fields);
    if (!fields.success) {
      log.error("Form fields not found");
      throw new Error("Form fields not found");
    }

    return {
      response: response.data,
      fields: fields.data,
    } satisfies RoutingFormResponseData;
  }
}
