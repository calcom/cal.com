import type { GetEventTypeById } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { Injectable, PipeTransform } from "@nestjs/common";
import { plainToClass } from "class-transformer";

import { EventTypeOutput_2024_06_14 } from "@calcom/platform-types";

import { OutputEventTypesService_2024_06_14 } from "../services/output-event-types.service";

type EventTypeResponse = GetEventTypeById & { ownerId: number };

@Injectable()
export class EventTypeResponseTransformPipe implements PipeTransform {
  constructor(private readonly outputEventTypesService: OutputEventTypesService_2024_06_14) {}

  private transformEventType(eventType: EventTypeResponse): EventTypeOutput_2024_06_14 {
    return plainToClass(
      EventTypeOutput_2024_06_14,
      this.outputEventTypesService.getResponseEventType(eventType.ownerId, eventType),
      { strategy: "exposeAll" }
    );
  }

  // Implementing function overloading to ensure correct return types based on input type:
  transform(value: EventTypeResponse[]): EventTypeOutput_2024_06_14[];

  transform(value: EventTypeResponse): EventTypeOutput_2024_06_14;

  transform(
    value: EventTypeResponse | EventTypeResponse[]
  ): EventTypeOutput_2024_06_14 | EventTypeOutput_2024_06_14[] {
    if (Array.isArray(value)) {
      return value.map((item) => this.transformEventType(item));
    } else {
      return this.transformEventType(value);
    }
  }
}
