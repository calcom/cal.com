"use client";

import { useLayoutEffect } from "react";

import "@calcom/embed-core/src/embed-iframe";
import { HttpError } from "@calcom/lib/http-error";
import { Button } from "@calcom/ui/components/button";

type Props = {
  statusCode?: number | null;
  error?: Error | HttpError | null;
  message?: string;
  /** Display debugging information */
  displayDebug?: boolean;
  children?: never;
  reset?: () => void;
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
                <div key={key} className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-5">
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
  const handleReset = () => {
    window.location.reload();
    props.reset?.();
  };

  // useLayoutEffect runs synchronously before browser paint, ensuring it's set early
  useLayoutEffect(() => {
    if (statusCode && typeof window !== "undefined") {
      window.CalComPageStatus = statusCode.toString();
    }
  }, [statusCode]);

  return (
    <>
      <div className="bg-subtle flex h-screen">
        <div className="rtl: bg-default m-auto rounded-md p-10 text-right ltr:text-left">
          <h1 className="font-cal text-emphasis text-6xl">{statusCode}</h1>
          <h2 className="text-emphasis mt-6 max-w-2xl text-2xl font-medium">
            It&apos;s not you, it&apos;s us.
          </h2>
          <p className="text-default mb-6 mt-4 max-w-2xl text-sm">
            Something went wrong on our end. Get in touch with our support team, and we&apos;ll get it fixed
            right away for you.
          </p>

          <div className="mb-8 flex flex-col">
            <p className="text-default mb-4 max-w-2xl text-sm">
              Please provide the following text when contacting support to better help you:
            </p>
            <pre className="bg-emphasis text-emphasis w-full max-w-2xl whitespace-normal wrap-break-word rounded-md p-4">
              {message}
            </pre>
          </div>

          <Button href="mailto:support@cal.com">Contact Support</Button>
          <Button color="secondary" className="ml-2" onClick={handleReset}>
            Try again
          </Button>
        </div>
      </div>
      {displayDebug && (
        <div className="flex-wrap">
          <ErrorDebugPanel error={error} />
        </div>
      )}
    </>
  );
};
