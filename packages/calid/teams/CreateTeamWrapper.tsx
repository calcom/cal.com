"use client";

import { ConfLayout } from "@calid/features/ui/components/layout/ConfLayout";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

const CreateTeamWrapper = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  const currentStep = useMemo(() => {
    if (!pathname) return 1;
    if (pathname.includes("/settings/teams/new")) return 1;
    if (pathname.includes("/onboard-members")) return 2;
    if (pathname.includes("/event-type")) return 3;
    return 1;
  }, [pathname]);

  return (
    <ConfLayout currentStep={currentStep} maxSteps={3}>
      {children}
    </ConfLayout>
  );
};
export default CreateTeamWrapper;
