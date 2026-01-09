"use client";

import { LoaderIcon } from "lucide-react";
import React, { Suspense } from "react";

import { ErrorBoundary } from "@calcom/ui/components/errorBoundary";

export default function TroubleshooterLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="*:flex-1 flex flex-1">
        <ErrorBoundary>
          <Suspense fallback={<LoaderIcon className="h-4 w-4 animate-spin" />}>{children}</Suspense>
        </ErrorBoundary>
      </div>
    </>
  );
}
