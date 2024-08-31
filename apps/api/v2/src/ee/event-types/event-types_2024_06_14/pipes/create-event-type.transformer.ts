import { Injectable, PipeTransform, ArgumentMetadata } from "@nestjs/common";

import { CreateEventTypeInput_2024_06_14 } from "@calcom/platform-types";

import { InputEventTypesService_2024_06_14 } from "../services/input-event-types.service";

@Injectable()
export class CreateEventTypeTransformPipe implements PipeTransform {
  constructor(private readonly inputEventTypesService: InputEventTypesService_2024_06_14) {}

  transform(value: CreateEventTypeInput_2024_06_14) {
    return this.inputEventTypesService.transformInputCreateEventType(value);
  }
}
