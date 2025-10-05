"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@calcom/ui/components/button";
import { Label } from "@calcom/ui/components/form";
import { Logo } from "@calcom/ui/components/logo";

type OrganizationBrandViewProps = {
  userEmail: string;
};

export const OrganizationBrandView = ({ userEmail }: OrganizationBrandViewProps) => {
  const router = useRouter();
  const [brandColor, setBrandColor] = useState("#000000");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const handleContinue = () => {
    // TODO: Save brand details and navigate to next step
    console.log({ brandColor, logoFile, bannerFile });
  };

  const handleSkip = () => {
    // TODO: Navigate to next step without saving
    console.log("Skipped brand setup");
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
        <div className="relative flex w-full max-w-[600px] flex-col gap-6">
          {/* Card */}
          <div className="bg-muted border-muted relative rounded-xl border p-1">
            <div className="rounded-inherit flex w-full flex-col items-start overflow-clip">
              {/* Card Header */}
              <div className="flex w-full gap-1.5 px-5 py-4">
                <div className="flex w-full flex-col gap-1">
                  <h1 className="font-cal text-xl font-semibold leading-6">Add your Organization's brand</h1>
                  <p className="text-subtle text-sm font-medium leading-tight">
                    Customize your booking pages with your logo and a custom banner
                  </p>
                </div>
              </div>

              {/* Form */}
              <div className="bg-default border-muted w-full rounded-[10px] border">
                <div className="rounded-inherit flex w-full flex-col items-start overflow-clip">
                  <div className="flex w-full flex-col items-start">
                    <div className="flex w-full gap-6 px-5 py-4">
                      {/* Left side - Form */}
                      <div className="flex w-full flex-col gap-6">
                        {/* Brand Color */}
                        <div className="flex w-full flex-col gap-6">
                          <p className="text-emphasis text-sm font-medium leading-4">Brand color</p>
                          <div className="flex w-full items-center gap-2">
                            <p className="text-subtle w-[98px] overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium leading-4">
                              Primary color
                            </p>
                            <div className="border-default flex h-7 w-32 items-center gap-2 rounded-lg border bg-white px-2 py-1.5">
                              <div
                                className="h-4 w-4 shrink-0 rounded-full border border-gray-200"
                                style={{ backgroundColor: brandColor }}
                              />
                              <input
                                type="text"
                                value={brandColor}
                                onChange={(e) => setBrandColor(e.target.value)}
                                className="text-emphasis grow border-none bg-transparent text-sm font-medium leading-4"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Logo Upload */}
                        <div className="flex w-full flex-col gap-2">
                          <p className="text-emphasis text-sm font-medium leading-4">Logo</p>
                          <div className="flex items-center gap-2">
                            <div className="bg-muted border-muted h-16 w-16 shrink-0 rounded-md border" />
                            <div className="flex flex-col gap-2">
                              <Button
                                color="secondary"
                                size="sm"
                                onClick={() => document.getElementById("logo-upload")?.click()}>
                                Upload
                              </Button>
                              <input
                                id="logo-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                              />
                            </div>
                          </div>
                          <p className="text-subtle text-xs font-normal leading-3">
                            Recommended size 64x64px (max 10mb)
                          </p>
                        </div>

                        {/* Banner Upload */}
                        <div className="flex w-full flex-col gap-2">
                          <p className="text-emphasis text-sm font-medium leading-4">Banner</p>
                          <div className="flex w-full flex-col gap-2">
                            <div className="bg-muted border-muted h-[92px] w-full rounded-md border" />
                            <div className="flex flex-col gap-2">
                              <Button
                                color="secondary"
                                size="sm"
                                className="w-fit"
                                onClick={() => document.getElementById("banner-upload")?.click()}>
                                Upload
                              </Button>
                              <input
                                id="banner-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                              />
                            </div>
                          </div>
                          <p className="text-subtle text-xs font-normal leading-3">
                            Recommended size 1500x150px (max 10mb)
                          </p>
                        </div>
                      </div>

                      {/* Right side - Preview */}
                      <div className="bg-muted border-muted flex h-[328px] w-full grow overflow-hidden rounded-[10px] border p-5">
                        <div className="flex flex-col gap-2.5">
                          <p className="text-subtle text-sm font-medium leading-4">Preview</p>
                          <div className="border-subtle relative flex w-[110%] flex-col gap-2.5 rounded-md border bg-white px-5 pb-5 pt-[74px]">
                            {/* Banner placeholder */}
                            <div className="bg-muted border-muted absolute left-1 top-1 h-[92px] w-[272px] rounded-[4px] border" />

                            {/* Content */}
                            <div className="flex flex-col gap-4">
                              <div className="flex flex-col gap-3 p-1">
                                <div className="flex flex-col gap-3">
                                  {/* Logo placeholder */}
                                  <div className="bg-muted z-20 h-9 w-9 shrink-0 rounded-md border-2 border-white" />
                                  <p className="text-subtle text-sm font-medium leading-4">Deel</p>
                                </div>
                                <div className="flex flex-col gap-3">
                                  <div className="flex flex-col gap-3">
                                    <p className="font-cal text-emphasis text-xl leading-5 tracking-[0.2px]">
                                      Enterprise sales
                                    </p>
                                    <p className="text-sm font-medium leading-5 text-gray-700">
                                      Jump on a call with one of our sales reps to learn more
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col gap-1">
                                {[134, 104, 84, 104].map((width, i) => (
                                  <div key={i} className="flex items-center gap-2 p-1">
                                    <div className="h-5 w-5 shrink-0 rounded-full bg-gray-100" />
                                    <div
                                      className="h-2.5 rounded-full bg-gray-100"
                                      style={{ width: `${width}px` }}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
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

          {/* Skip button - positioned absolutely */}
          <button
            onClick={handleSkip}
            className="text-subtle hover:bg-subtle absolute left-[370px] top-[458px] rounded-[10px] px-2 py-1.5 text-sm font-medium leading-4">
            I'll do this later
          </button>
        </div>
      </div>
    </div>
  );
};
