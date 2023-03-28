import { Suspense } from "react";

import { Meta } from "@calcom/ui";
import { FiLoader } from "@calcom/ui/components/icon";

import { FlagAdminList } from "../components/FlagAdminList";

export const FlagListingView = () => {
  return (
    <>
      <Meta title="Feature Flags" description="Here you can toggle your Cal.com instance features." />
      <Suspense fallback={<FiLoader />}>
        <FlagAdminList />
      </Suspense>
    </>
  );
};
