"use client";

import { ConfLayout } from "@calid/features/ui/components/layout/ConfLayout";

const CreateTeamWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <ConfLayout currentStep={1} maxSteps={3}>
      {children}
    </ConfLayout>
  );
};
export default CreateTeamWrapper;
