"use client";

import React, { Suspense } from "react";
import { Icon } from "@calcom/ui/components/icon";

import { ErrorBoundary } from "@calcom/ui/components/errorBoundary";

export default function TroubleshooterLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex flex-1 *:flex-1">
        <ErrorBoundary>
          <Suspense fallback={<Icon name="loader" />}>{children}</Suspense>
        </ErrorBoundary>
      </div>
    </>
  );
}
