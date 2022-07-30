import { ReactNode } from "react";

import Shell from "@calcom/ui/Shell";

import RoutingNavBar from "../components/RoutingNavBar";
import { getSerializableForm } from "../utils";

const RoutingShell: React.FC<{
  form: ReturnType<typeof getSerializableForm>;
  heading: ReactNode;
  appUrl: string;
  children: ReactNode;
}> = function RoutingShell({ children, form, heading, appUrl }) {
  return (
    <Shell heading={heading} subtitle={form.description || ""}>
      <div className="-mx-4 px-4 sm:px-6 md:-mx-8 md:px-8">
        <div className="bg-gray-50">
          <RoutingNavBar appUrl={appUrl} form={form} />
          {children}
        </div>
      </div>
    </Shell>
  );
};
export default RoutingShell;
