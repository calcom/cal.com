// Re-export from packages/lib to avoid circular dependencies
export { decodeParams, buildLegacyRequest, buildLegacyCtx } from "@calcom/lib/buildLegacyCtx";
export type { Params, SearchParams, ReadonlyHeaders, ReadonlyRequestCookies } from "@calcom/lib/buildLegacyCtx";
