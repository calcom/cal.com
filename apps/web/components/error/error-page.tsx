import React from "react";

import { HttpError } from "@calcom/lib/http-error";

type Props = {
  statusCode?: number | null;
  error?: Error | HttpError | null;
  message?: string;
  /** Display debugging information */
  displayDebug?: boolean;
  children?: never;
};

const defaultProps = {
  displayDebug: false,
};

const ErrorDebugPanel: React.FC<{ error: Props["error"]; children?: never }> = (props) => {
  const { error: e } = props;

  const debugMap = [
    ["error.message", e?.message],
    ["error.name", e?.name],
    ["error.class", e instanceof Error ? e.constructor.name : undefined],
    ["http.url", e instanceof HttpError ? e.url : undefined],
    ["http.status", e instanceof HttpError ? e.statusCode : undefined],
    ["http.cause", e instanceof HttpError ? e.cause?.message : undefined],
    ["error.stack", e instanceof Error ? e.stack : undefined],
  ];

  return (
    <div className="bg-default overflow-hidden shadow sm:rounded-lg">
      <div className="border-subtle border-t px-4 py-5 sm:p-0">
        <dl className="sm:divide-subtle sm:divide-y">
          {debugMap.map(([key, value]) => {
            if (value !== undefined) {
              return (
                <div key={key} className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
                  <dt className="text-emphasis text-sm font-bold">{key}</dt>
                  <dd className="text-emphasis mt-1 text-sm sm:col-span-2 sm:mt-0">{value}</dd>
                </div>
              );
            }
          })}
        </dl>
      </div>
    </div>
  );
};

export const ErrorPage: React.FC<Props> = (props) => {
  const { message, statusCode, error, displayDebug } = { ...defaultProps, ...props };

  return (
    <>
      <div className="bg-default min-h-screen px-4">
        <main className="mx-auto max-w-xl pb-6 pt-16 sm:pt-24">
          <div className="text-center">
            <p className="text-emphasis text-sm font-semibold uppercase tracking-wide">{statusCode}</p>
            <h1 className="text-emphasis mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">
              {message}
            </h1>
          </div>
        </main>
        {displayDebug && (
          <div className="flex-wrap">
            <ErrorDebugPanel error={error} />
          </div>
        )}
      </div>
    </>
  );
};
