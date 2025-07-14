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

  async create({ bookingUid, responseId }: { bookingUid?: string; responseId?: number }) {
    const log = this.deps.logger.getSubLogger({
      prefix: ["[routingFormFieldService]", { bookingUid, responseId }],
    });

    let formResponse: Awaited<ReturnType<RoutingFormResponseRepositoryInterface["findById"]>>;
    if (responseId) {
      formResponse = await this.deps.routingFormResponseRepo.findById(responseId);
    } else if (bookingUid) {
      formResponse = await this.deps.routingFormResponseRepo.findByBookingUid(bookingUid);
    } else {
      log.error("No bookingUid or responseId provided");
      throw new Error("No bookingUid or responseId provided");
    }

    if (!formResponse) {
      log.error("Form response not found");
      throw new Error("Form response not found");
    }

    const response = routingFormResponseInDbSchema.safeParse(formResponse.response);
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
