"use client";

import { Suspense } from "react";

import { ErrorBoundary } from "@calcom/ui/components/errorBoundary";
import { Icon } from "@calcom/ui/components/icon";

import Troubleshoot from "~/availability/troubleshoot/troubleshoot-view";

const ClientPage = () => {
  return (
    <div className="flex flex-1 [&>*]:flex-1">
      <ErrorBoundary>
        <Suspense fallback={<Icon name="loader" />}>
          <Troubleshoot />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

export default ClientPage;
