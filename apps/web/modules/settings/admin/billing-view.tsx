"use client";

import { CustomerLookupSection } from "./components/CustomerLookup";
import LicenseView from "./license-view";

export default function AdminBillingView() {
  return (
    <div className="flex flex-col gap-4">
      <CustomerLookupSection />
      <LicenseView />
    </div>
  );
}
