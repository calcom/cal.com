import { EventTypeHandlerResponse } from "@/modules/organizations/controllers/event-types/organizations-event-types.controller";
import { OutputOrganizationsEventTypesService } from "@/modules/organizations/services/event-types/output.service";
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { switchMap } from "rxjs/operators";

@Injectable()
export class OutputEventTypesResponseInterceptor<T> implements NestInterceptor {
  constructor(private readonly outputOrganizationsEventTypesService: OutputOrganizationsEventTypesService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<T> {
    return next.handle().pipe(
      switchMap(async (response: EventTypeHandlerResponse) => {
        const { data, status } = response;

        let transformedData;
        if (Array.isArray(data)) {
          const eventTypePromises = data.map((eventType) =>
            this.outputOrganizationsEventTypesService.getResponseTeamEventType(eventType)
          );
          transformedData = await Promise.all(eventTypePromises);
        } else {
          transformedData = await this.outputOrganizationsEventTypesService.getResponseTeamEventType(data);
        }

        return {
          status,
          data: transformedData,
        } as T;
      })
    );
  }
}
