"use client";

import React, { Suspense } from "react";
import { LoaderIcon } from "lucide-react";

import { ErrorBoundary } from "@calcom/ui/components/errorBoundary";

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
