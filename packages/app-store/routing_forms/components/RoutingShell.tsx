import { useLocale } from "@calcom/lib/hooks/useLocale";

import NavTabs from "@components/NavTabs";
import Shell from "@components/Shell";

import RoutingNavBar from "../components/RoutingNavBar";

export default function RoutingShell({ children, form, heading }) {
  return (
    <Shell heading={heading} subtitle="Create form using form builder and route based on inputs to that form">
      <div className="-mx-4 sm:px-6 md:-mx-8 md:px-8">
        <div className="bg-gray-50 px-4 pb-2">
          <RoutingNavBar form={form}></RoutingNavBar>
          {children}
        </div>
      </div>
    </Shell>
  );
}
