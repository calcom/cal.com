import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TGetAllActiveWorkflowsInputSchema } from "./getAllActiveWorkflows.schema";
import { getAllWorkflowsFromEventType } from "./util";

type GetAllActiveWorkflowsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetAllActiveWorkflowsInputSchema;
};

export const getAllActiveWorkflowsHandler = async ({ input }: GetAllActiveWorkflowsOptions) => {
  const { eventType } = input;

  const allActiveWorkflows = await getAllWorkflowsFromEventType(eventType, eventType.userId);

  return allActiveWorkflows;
};
