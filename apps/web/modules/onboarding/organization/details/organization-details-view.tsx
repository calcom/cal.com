"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@calcom/ui/components/button";
import { Label, TextField, TextAreaField, TextArea } from "@calcom/ui/components/form";
import { Logo } from "@calcom/ui/components/logo";

type OrganizationDetailsViewProps = {
  userEmail: string;
};

export const OrganizationDetailsView = ({ userEmail }: OrganizationDetailsViewProps) => {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState("");
  const [organizationLink, setOrganizationLink] = useState("");
  const [organizationBio, setOrganizationBio] = useState("");

  const handleContinue = () => {
    // TODO: Save organization details
    console.log({ organizationName, organizationLink, organizationBio });
    router.push("/onboarding/organization/brand");
  };

  return (
    <div className="bg-default flex min-h-screen w-full flex-col items-start overflow-clip rounded-xl">
      {/* Header */}
      <div className="flex w-full items-center justify-between px-6 py-4">
        <Logo className="h-5 w-auto" />

        {/* Progress dots - centered */}
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center gap-1">
          <div className="bg-emphasis h-1 w-1 rounded-full" />
          <div className="bg-emphasis h-1.5 w-1.5 rounded-full" />
          <div className="bg-subtle h-1 w-1 rounded-full" />
          <div className="bg-subtle h-1 w-1 rounded-full" />
        </div>

        <div className="bg-muted flex items-center gap-2 rounded-full px-3 py-2">
          <p className="text-emphasis text-sm font-medium leading-none">{userEmail}</p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex h-full w-full items-start justify-center px-6 py-8">
        <div className="flex w-full max-w-[600px] flex-col gap-6">
          {/* Card */}
          <div className="bg-muted border-muted relative rounded-xl border p-1">
            <div className="rounded-inherit flex w-full flex-col items-start overflow-clip">
              {/* Card Header */}
              <div className="flex w-full gap-1.5 px-5 py-4">
                <div className="flex w-full flex-col gap-1">
                  <h1 className="font-cal text-xl font-semibold leading-6">
                    Add your Organization's details
                  </h1>
                  <p className="text-subtle text-sm font-medium leading-tight">
                    Customize your booking pages with your Organization's name and bio
                  </p>
                </div>
              </div>

              {/* Form */}
              <div className="bg-default border-muted w-full rounded-[10px] border">
                <div className="rounded-inherit flex w-full flex-col items-start overflow-clip">
                  <div className="flex w-full flex-col items-start">
                    <div className="flex w-full gap-6 px-5 py-5">
                      <div className="flex w-full flex-col gap-4 rounded-xl">
                        {/* Organization Name */}
                        <div className="flex w-full flex-col gap-1.5">
                          <Label className="text-emphasis text-sm font-medium leading-4">
                            Organization name
                          </Label>
                          <TextField
                            value={organizationName}
                            onChange={(e) => setOrganizationName(e.target.value)}
                            placeholder="Acme"
                            className="border-default h-7 rounded-[10px] border px-2 py-1.5 text-sm"
                          />
                        </div>

                        {/* Organization Link */}
                        <div className="flex w-full flex-col gap-1.5">
                          <Label className="text-emphasis text-sm font-medium leading-4">
                            Organization link
                          </Label>
                          <TextField
                            value={organizationLink}
                            onChange={(e) => setOrganizationLink(e.target.value)}
                            placeholder="acme"
                            addOnSuffix={<span className="text-subtle text-sm">.cal.com</span>}
                            className="h-7 rounded-[10px] text-sm"
                          />
                        </div>

                        {/* Organization Bio */}
                        <div className="flex w-full flex-col gap-1.5">
                          <Label className="text-emphasis text-sm font-medium leading-4">
                            Organization bio
                          </Label>
                          <TextArea
                            value={organizationBio}
                            onChange={(e) => setOrganizationBio(e.target.value)}
                            placeholder="Acme helps thousands of companies expand globally with unmatched speed and flexibility."
                            rows={4}
                            className="border-default rounded-lg border px-2 py-2 text-sm leading-tight"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex w-full items-center justify-end gap-1 px-5 py-4">
                <Button color="primary" className="rounded-[10px]" onClick={handleContinue}>
                  Continue
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
