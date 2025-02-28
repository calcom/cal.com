"use client";

import React, { Suspense } from "react";

import { ErrorBoundary, Icon } from "@calcom/ui";

export default function TroubleshooterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 [&>*]:flex-1">
      <ErrorBoundary>
        <Suspense fallback={<Icon name="loader" />}>{children}</Suspense>
      </ErrorBoundary>
    </div>
  );
}
