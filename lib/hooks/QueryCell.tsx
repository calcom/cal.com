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
interface QueryCellOptions<TData, TError extends ErrorLike> {
  query: UseQueryResult<TData, TError>;
  success: (query: QueryObserverSuccessResult<TData, TError>) => JSX.Element;
  error?: (
    query: QueryObserverLoadingErrorResult<TData, TError> | QueryObserverRefetchErrorResult<TData, TError>
  ) => JSX.Element;
  loading?: (query: QueryObserverLoadingResult<TData, TError>) => JSX.Element;
  idle?: (query: QueryObserverIdleResult<TData, TError>) => JSX.Element;
  /**
   * If there's no data (`null`, `undefined`, or `[]`), render this component
   */
  empty?: (query: QueryObserverSuccessResult<TData, TError>) => JSX.Element;
}

export function QueryCell<TData, TError extends ErrorLike>(opts: QueryCellOptions<TData, TError>) {
  const { query } = opts;

  if (query.status === "success") {
    if (opts.empty && (query.data == null || (Array.isArray(query.data) && query.data.length === 0))) {
      return opts.empty(query);
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
