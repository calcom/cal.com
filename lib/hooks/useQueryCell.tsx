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
interface QueryCellBaseOptions<TData, TError extends ErrorLike> {
  query: UseQueryResult<TData, TError>;
  success: (result: QueryObserverSuccessResult<TData>) => JSX.Element;
  error?: (
    result: QueryObserverLoadingErrorResult<TData, TError> | QueryObserverRefetchErrorResult<TData, TError>
  ) => JSX.Element;
  loading?: (query: QueryObserverLoadingResult<TData, TError>) => JSX.Element;
  idle?: (query: QueryObserverIdleResult<TData, TError>) => JSX.Element;
}
interface QueryCellArrayOptionsOptions<TData, TError extends ErrorLike>
  extends QueryCellBaseOptions<TData, TError> {
  empty?: (result: QueryObserverSuccessResult<TData>) => JSX.Element;
}
type QueryCellOptions<TData, TError extends ErrorLike> = TData extends Array<unknown>
  ? QueryCellArrayOptionsOptions<TData, TError>
  : QueryCellBaseOptions<TData, TError>;

export function useQueryCell<TData, TError extends ErrorLike>(opts: QueryCellOptions<TData, TError>) {
  const { query } = opts;

  if (query.status === "success") {
    const _opts = opts as QueryCellArrayOptionsOptions<TData, TError>;
    if (Array.isArray(query.data) && query.data.length === 0 && _opts.empty) {
      return _opts.empty(query);
    }
    return opts.success(query);
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

export function QueryCell<TData, TError extends ErrorLike>(opts: QueryCellOptions<TData, TError>) {
  return useQueryCell(opts);
}
