// src/interceptors/output-event-type-response.interceptor.ts
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

import { OutputEventTypesService_2024_06_14 } from "../services/output-event-types.service";

@Injectable()
export class OutputEventTypeResponseInterceptor<T> implements NestInterceptor {
  constructor(private readonly outputEventTypesService: OutputEventTypesService_2024_06_14) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<T> {
    return next.handle().pipe(
      map((response) => {
        if (!response?.data || !response?.status) {
          return response;
        }

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
