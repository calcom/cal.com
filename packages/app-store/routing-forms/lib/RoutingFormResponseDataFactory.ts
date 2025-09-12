import type logger from "@calcom/lib/logger";
import type { RoutingFormResponseRepositoryInterface } from "@calcom/lib/server/repository/RoutingFormResponseRepository.interface";

import { parseRoutingFormResponse } from "./responseData/parseRoutingFormResponse";

interface Dependencies {
  logger: typeof logger;
  routingFormResponseRepo: RoutingFormResponseRepositoryInterface;
}

export class RoutingFormResponseDataFactory {
  constructor(private readonly deps: Dependencies) {}

  async createWithBookingUid(bookingUid: string) {
    const log = this.deps.logger.getSubLogger({
      prefix: ["[routingFormFieldService]", { bookingUid }],
    });

    const formResponse = await this.deps.routingFormResponseRepo.findByBookingUidIncludeForm(bookingUid);

    if (!formResponse) {
      log.error("Form response not found");
      throw new Error("Form response not found");
    }

    return parseRoutingFormResponse(formResponse.response, formResponse.form.fields);
  }

  async createWithResponseId(responseId: number) {
    const log = this.deps.logger.getSubLogger({
      prefix: ["[routingFormFieldService]", { responseId }],
    });

    const formResponse = await this.deps.routingFormResponseRepo.findByIdIncludeForm(responseId);

    if (!formResponse) {
      log.error("Form response not found");
      throw new Error("Form response not found");
    }

    return parseRoutingFormResponse(formResponse.response, formResponse.form.fields);
  }
}
