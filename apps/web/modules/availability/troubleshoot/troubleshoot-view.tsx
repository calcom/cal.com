"use client";

import { Loader } from "@calcom/ui/components/skeleton";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const TroubleshooterClientOnly = dynamic(
  () =>
    import("@calcom/web/modules/troubleshooter/components/Troubleshooter").then((mod) => mod.Troubleshooter),
  {
    ssr: false,
  }
);

function TroubleshooterPage() {
  return (
    <>
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center">
            <Loader />
          </div>
        }>
        <TroubleshooterClientOnly month={null} />
      </Suspense>
    </>
  );
}

export default TroubleshooterPage;
