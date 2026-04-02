"use client";

import { ErrorBoundary } from "@calcom/ui/components/errorBoundary";
import { LoaderIcon } from "@coss/ui/icons";
import type React from "react";
import { Suspense } from "react";

export default function TroubleshooterLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex flex-1 *:flex-1">
        <ErrorBoundary>
          <Suspense fallback={<LoaderIcon />}>{children}</Suspense>
        </ErrorBoundary>
      </div>
    </>
  );
}
