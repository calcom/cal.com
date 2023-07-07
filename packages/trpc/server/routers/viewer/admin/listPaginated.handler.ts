import type { TrpcSessionUser } from "../../../trpc";

type ListPaginatedOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listPaginated = async ({ ctx }: ListPaginatedOptions) => {};
