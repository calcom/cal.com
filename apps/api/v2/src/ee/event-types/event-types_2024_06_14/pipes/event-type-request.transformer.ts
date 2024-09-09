import { Injectable, PipeTransform, ArgumentMetadata } from "@nestjs/common";

import { CreateEventTypeInput_2024_06_14 } from "@calcom/platform-types";

import { InputEventTypesService_2024_06_14 } from "../services/input-event-types.service";

@Injectable()
export class CreateEventTypeRequestTransformPipe implements PipeTransform {
  constructor(private readonly inputEventTypesService: InputEventTypesService_2024_06_14) {}

  transform(value: CreateEventTypeInput_2024_06_14, metadata: ArgumentMetadata) {
    if (metadata.type === "body") {
      return this.inputEventTypesService.transformInputCreateEventType(value);
    }
    return value;
  }
}
