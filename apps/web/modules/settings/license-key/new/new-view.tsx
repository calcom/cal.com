"use client";

import { CreateANewLicenseKeyForm } from "~/ee/deployment/components/CreateLicenseKeyForm";

export default function SettingsNewView() {
  return (
    <div className="bg-default flex min-h-screen items-start justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <CreateANewLicenseKeyForm />
      </div>
    </div>
  );
}
