import { EventTypeResponse } from "@/ee/event-types/event-types_2024_06_14/controllers/event-types.controller";
import { GetEventTypesOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/get-event-types.output";
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";

import { OutputEventTypesService_2024_06_14 } from "../services/output-event-types.service";

@Injectable()
export class OutputEventTypesResponseInterceptor implements NestInterceptor {
  constructor(private outputEventTypesService: OutputEventTypesService_2024_06_14) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<GetEventTypesOutput_2024_06_14> {
    return next.handle().pipe(
      map((response) => {
        const {
          data,
          status,
        }: {
          data: EventTypeResponse[];
          status: typeof SUCCESS_STATUS | typeof ERROR_STATUS;
        } = response;

        const transformedData = data.map((eventType) =>
          this.outputEventTypesService.getResponseEventType(eventType.ownerId, eventType)
        );

        console.log("TransformedData: ", transformedData);

        return {
          data: transformedData,
          status: status,
        } satisfies GetEventTypesOutput_2024_06_14;
      })
    );
  }
}
