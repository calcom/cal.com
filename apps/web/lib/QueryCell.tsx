import { ReactNode } from "react";
import {
  QueryObserverIdleResult,
  QueryObserverLoadingErrorResult,
  QueryObserverLoadingResult,
  QueryObserverRefetchErrorResult,
  QueryObserverSuccessResult,
  UseQueryResult,
} from "react-query";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { TRPCClientErrorLike } from "@calcom/trpc/client";
import type { UseTRPCQueryOptions } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import type {
  inferHandlerInput,
  inferProcedureInput,
  inferProcedureOutput,
  ProcedureRecord,
} from "@calcom/trpc/server";
import type { AppRouter } from "@calcom/trpc/server/routers/_app";
import { Alert } from "@calcom/ui/Alert";
import Loader from "@calcom/ui/Loader";

type ErrorLike = {
  message: string;
};
type JSXElementOrNull = JSX.Element | null;

interface QueryCellOptionsBase<TData, TError extends ErrorLike> {
  query: UseQueryResult<TData, TError>;
  customLoader?: ReactNode;
  error?: (
    query: QueryObserverLoadingErrorResult<TData, TError> | QueryObserverRefetchErrorResult<TData, TError>
  ) => JSXElementOrNull;
  loading?: (query: QueryObserverLoadingResult<TData, TError> | null) => JSXElementOrNull;
  idle?: (query: QueryObserverIdleResult<TData, TError>) => JSXElementOrNull;
}

interface QueryCellOptionsNoEmpty<TData, TError extends ErrorLike>
  extends QueryCellOptionsBase<TData, TError> {
  success: (query: QueryObserverSuccessResult<TData, TError>) => JSXElementOrNull;
}

interface QueryCellOptionsWithEmpty<TData, TError extends ErrorLike>
  extends QueryCellOptionsBase<TData, TError> {
  success: (query: QueryObserverSuccessResult<NonNullable<TData>, TError>) => JSXElementOrNull;
  /**
   * If there's no data (`null`, `undefined`, or `[]`), render this component
   */
  empty: (query: QueryObserverSuccessResult<TData, TError>) => JSXElementOrNull;
}

export function QueryCell<TData, TError extends ErrorLike>(
  opts: QueryCellOptionsWithEmpty<TData, TError>
): JSXElementOrNull;
export function QueryCell<TData, TError extends ErrorLike>(
  opts: QueryCellOptionsNoEmpty<TData, TError>
): JSXElementOrNull;
/** @deprecated Use `trpc.useQuery` instead. */
export function QueryCell<TData, TError extends ErrorLike>(
  opts: QueryCellOptionsNoEmpty<TData, TError> | QueryCellOptionsWithEmpty<TData, TError>
) {
  const { query } = opts;
  const { isLocaleReady } = useLocale();
  const StatusLoader = opts.customLoader || <Loader />; // Fixes edge case where this can return null form query cell

  if (query.status === "loading" || !isLocaleReady) {
    return opts.loading?.(query.status === "loading" ? query : null) ?? StatusLoader;
  }

  if (query.status === "success") {
    if ("empty" in opts && (query.data == null || (Array.isArray(query.data) && query.data.length === 0))) {
      return opts.empty(query);
    }
    return opts.success(query as any);
  }

  if (query.status === "error") {
    return (
      opts.error?.(query) ?? (
        <Alert severity="error" title="Something went wrong" message={query.error.message} />
      )
    );
  }

  if (query.status === "idle") {
    return opts.idle?.(query) ?? StatusLoader;
  }
  // impossible state
  return null;
}

type inferProcedures<TObj extends ProcedureRecord<any, any, any, any, any, any>> = {
  [TPath in keyof TObj]: {
    input: inferProcedureInput<TObj[TPath]>;
    output: inferProcedureOutput<TObj[TPath]>;
  };
};
type TQueryValues = inferProcedures<AppRouter["_def"]["queries"]>;
type TQueries = AppRouter["_def"]["queries"];
type TError = TRPCClientErrorLike<AppRouter>;

const withQuery = <TPath extends keyof TQueryValues & string>(
  pathAndInput: [path: TPath, ...args: inferHandlerInput<TQueries[TPath]>],
  params?: UseTRPCQueryOptions<
    TPath,
    TQueryValues[TPath]["input"],
    TQueryValues[TPath]["output"],
    TQueryValues[TPath]["output"],
    TError
  >
) => {
  return function WithQuery(
    opts: Omit<
      Partial<QueryCellOptionsWithEmpty<TQueryValues[TPath]["output"], TError>> &
        QueryCellOptionsNoEmpty<TQueryValues[TPath]["output"], TError>,
      "query"
    >
  ) {
    const query = trpc.useQuery(pathAndInput, params);
    return <QueryCell query={query} {...opts} />;
  };
};

export { withQuery };
