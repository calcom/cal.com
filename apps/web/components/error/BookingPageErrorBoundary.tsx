import { captureReactException } from "@sentry/nextjs";
import React from "react";
import { ErrorBoundary } from "react-error-boundary";

import { ErrorPage } from "./error-page";

export default function BookingPageErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <ErrorPage reset={resetErrorBoundary} error={error} message={`${error}`} displayDebug={true} />
      )}
      onError={(error, info) => {
        console.error(error);
        captureReactException(error, info);
      }}>
      {children}
    </ErrorBoundary>
  );
}
