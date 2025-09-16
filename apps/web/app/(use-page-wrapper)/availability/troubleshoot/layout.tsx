"use client";

import { Icon } from "@calid/features/ui/components/icon";
import React, { Suspense } from "react";

import { ErrorBoundary } from "@calcom/ui/components/errorBoundary";

export default function TroubleshooterLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex flex-1 [&>*]:flex-1">
        <ErrorBoundary>
          <Suspense fallback={<Icon name="loader" />}>{children}</Suspense>
        </ErrorBoundary>
      </div>
    </>
  );
}
