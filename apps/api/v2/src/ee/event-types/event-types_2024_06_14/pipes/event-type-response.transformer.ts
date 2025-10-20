import { Injectable, PipeTransform } from "@nestjs/common";
import { plainToClass } from "class-transformer";

import { EventTypeOutput_2024_06_14 } from "@calcom/platform-types";

import {
  DatabaseEventType,
  OutputEventTypesService_2024_06_14,
} from "../services/output-event-types.service";

type EventTypeResponse = DatabaseEventType & { ownerId: number };

@Injectable()
export class EventTypeResponseTransformPipe implements PipeTransform {
  constructor(private readonly outputEventTypesService: OutputEventTypesService_2024_06_14) {}

  private async transformEventType(eventType: EventTypeResponse): Promise<EventTypeOutput_2024_06_14> {
    const output = await this.outputEventTypesService.getResponseEventType(
      eventType.ownerId,
      eventType,
      false
    );
    return plainToClass(EventTypeOutput_2024_06_14, output, { strategy: "exposeAll" });
  }

  // Implementing function overloading to ensure correct return types based on input type:
  async transform(value: EventTypeResponse[]): Promise<EventTypeOutput_2024_06_14[]>;

  async transform(value: EventTypeResponse): Promise<EventTypeOutput_2024_06_14>;

  async transform(
    value: EventTypeResponse | EventTypeResponse[]
  ): Promise<EventTypeOutput_2024_06_14 | EventTypeOutput_2024_06_14[]> {
    if (Array.isArray(value)) {
      return Promise.all(value.map((item) => this.transformEventType(item)));
    } else {
      return this.transformEventType(value);
    }
  }
}
