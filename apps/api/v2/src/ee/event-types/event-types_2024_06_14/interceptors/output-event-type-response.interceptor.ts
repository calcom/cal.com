// src/interceptors/output-event-type-response.interceptor.ts
import { HandlerRespose } from "@/ee/event-types/event-types_2024_06_14/controllers/event-types.controller";
import { OutputEventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/output-event-types.service";
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

@Injectable()
export class OutputEventTypeResponseInterceptor<T> implements NestInterceptor {
  constructor(private readonly outputEventTypesService: OutputEventTypesService_2024_06_14) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<T> {
    return next.handle().pipe(
      map((response: HandlerRespose): T => {
        const { data, status } = response;
        const transformedData = this.outputEventTypesService.getResponseEventType(data.ownerId, data);

        return {
          status,
          data: transformedData,
        } as T;
      })
    );
  }
}
