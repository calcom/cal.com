import type { TrpcSessionUser } from "../../../../types";

export interface GetSystemWatchlistPermissionsOptions {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
}
