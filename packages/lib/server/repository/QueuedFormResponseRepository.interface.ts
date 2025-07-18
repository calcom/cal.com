import type { App_RoutingForms_QueuedFormResponse } from "@prisma/client";

export interface QueuedFormResponseRepositoryInterface {
  findExpiredResponses(params: { cutoffTime: Date; take: number }): Promise<{ id: string }[]>;

  deleteByIds(ids: string[]): Promise<{ count: number }>;

  findById(id: string): Promise<App_RoutingForms_QueuedFormResponse | null>;

  create(data: {
    formId: string;
    response: unknown;
    chosenRouteId: string | null;
  }): Promise<App_RoutingForms_QueuedFormResponse>;

  findByIdIncludeForm(id: string): Promise<
    | (App_RoutingForms_QueuedFormResponse & {
        form: {
          routes: unknown;
          fields: unknown;
        };
      })
    | null
  >;
}

