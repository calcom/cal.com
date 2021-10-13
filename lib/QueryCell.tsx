import {
  QueryObserverIdleResult,
  QueryObserverLoadingErrorResult,
  QueryObserverLoadingResult,
  QueryObserverRefetchErrorResult,
  QueryObserverSuccessResult,
  UseQueryResult,
} from "react-query";

import Loader from "@components/Loader";
import { Alert } from "@components/ui/Alert";

type ErrorLike = {
  message: string;
};

interface QueryCellOptionsBase<TData, TError extends ErrorLike> {
  query: UseQueryResult<TData, TError>;
  error?: (
    query: QueryObserverLoadingErrorResult<TData, TError> | QueryObserverRefetchErrorResult<TData, TError>
  ) => JSX.Element;
  loading?: (query: QueryObserverLoadingResult<TData, TError>) => JSX.Element;
  idle?: (query: QueryObserverIdleResult<TData, TError>) => JSX.Element;
}

interface QueryCellOptionsNoEmpty<TData, TError extends ErrorLike>
  extends QueryCellOptionsBase<TData, TError> {
  success: (query: QueryObserverSuccessResult<TData, TError>) => JSX.Element;
}

interface QueryCellOptionsWithEmpty<TData, TError extends ErrorLike>
  extends QueryCellOptionsBase<TData, TError> {
  success: (query: QueryObserverSuccessResult<NonNullable<TData>, TError>) => JSX.Element;
  /**
   * If there's no data (`null`, `undefined`, or `[]`), render this component
   */
  empty: (query: QueryObserverSuccessResult<TData, TError>) => JSX.Element;
}

export function QueryCell<TData, TError extends ErrorLike>(
  opts: QueryCellOptionsWithEmpty<TData, TError>
): JSX.Element;
export function QueryCell<TData, TError extends ErrorLike>(
  opts: QueryCellOptionsNoEmpty<TData, TError>
): JSX.Element;
export function QueryCell<TData, TError extends ErrorLike>(
  opts: QueryCellOptionsNoEmpty<TData, TError> | QueryCellOptionsWithEmpty<TData, TError>
) {
  const { query } = opts;

  if (query.status === "success") {
    if ("empty" in opts && (query.data == null || (Array.isArray(query.data) && query.data.length === 0))) {
      return opts.empty(query);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return opts.success(query as any);
  }
  if (query.status === "error") {
    return (
      opts.error?.(query) ?? (
        <Alert severity="error" title="Something went wrong" message={query.error.message} />
      )
    );
  }
  if (query.status === "loading") {
    return opts.loading?.(query) ?? <Loader />;
  }
  if (query.status === "idle") {
    return null;
  }
  // impossible state
  return null;
}
