import { PipeTransform, Injectable } from "@nestjs/common";

import { InputEventTransformed_2024_06_14 } from "@calcom/platform-types";

import { InputEventTypesService_2024_06_14 } from "../services/input-event-types.service";

@Injectable()
export class ValidateEventTypeInputsPipe implements PipeTransform {
  constructor(private readonly inputEventTypesService: InputEventTypesService_2024_06_14) {}

  async transform(body: InputEventTransformed_2024_06_14) {
    await this.inputEventTypesService.validateEventTypeInputs(
      undefined,
      !!(body?.seatsPerTimeSlot && body?.seatsPerTimeSlot > 0),
      body.locations,
      body.requiresConfirmation
    );

    return body;
  }
}
