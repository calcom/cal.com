import {
  CalIdContactRepository,
  type CalIdContactSortBy,
  type CalIdContactSortDirection,
} from "@calcom/lib/server/repository/calIdContact";

import type { TrpcSessionUser } from "../../../types";
import type { TCalIdContactsListInputSchema } from "./list.schema";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input?: TCalIdContactsListInputSchema;
};

export const listCalIdContactsHandler = async ({ ctx, input }: ListOptions) => {
  const repository = new CalIdContactRepository();

  const sortBy: CalIdContactSortBy = input?.sortBy ?? "name";
  const sortDirection: CalIdContactSortDirection = input?.sortDirection ?? "asc";
  const limit = input?.limit ?? 10;
  const offset = input?.offset ?? 0;

  const { rows, totalRowCount } = await repository.listByUserId({
    userId: ctx.user.id,
    search: input?.search,
    sortBy,
    sortDirection,
    limit,
    offset,
  });

  return {
    rows,
    meta: {
      totalRowCount,
      limit,
      offset,
      hasMore: offset + rows.length < totalRowCount,
    },
  };
};
