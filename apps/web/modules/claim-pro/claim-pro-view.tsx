"use client";

import { TallyForm } from "@calid/features/modules/claim-pro/TallyForm";
import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from "@calid/features/ui/components/dialog";
import { Icon } from "@calid/features/ui/components/icon";
import { InputField } from "@calid/features/ui/components/input/input";
import { SkeletonText } from "@calid/features/ui/components/skeleton";
import { triggerToast } from "@calid/features/ui/components/toast";
import { useSession } from "next-auth/react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

import { useCopy } from "@calcom/lib/hooks/useCopy";
import { trpc } from "@calcom/trpc/react";

export interface PageProps {
  userId: number;
  userMetadata: {
    isProUser?: {
      yearClaimed?: number;
      formSubmittedForYear?: number;
      validTillDate?: string;
      verifield?: boolean;
      firstYearClaimDate?: string;
    };
  };
}

export default function Page({ userMetadata: initialUserMetadata }: PageProps) {
  const [userMetadata, setUserMetadata] = useState(initialUserMetadata);
  const [showTallyForm, setShowTallyForm] = useState(false);
  const [showStepsDialog, setShowStepsDialog] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const formSubmittedForYear = userMetadata.isProUser?.formSubmittedForYear || 0;
  const { data: session } = useSession();
  const userEmail = session?.user?.email;
  const { copyToClipboard } = useCopy();
  const { data: userData } = trpc.viewer.me.calid_get.useQuery();
  const username = userData?.username || "";

  const { data: uniqueAttendeesData, isLoading: isLoadingAttendees } =
    trpc.viewer.me.getUniqueAttendeesCount.useQuery(undefined, {
      enabled: formSubmittedForYear >= 1,
    });

  const { data: calendarApps } = trpc.viewer.apps.calid_integrations.useQuery({
    variant: "calendar",
    onlyInstalled: true,
  });

  const { data: conferencingApps } = trpc.viewer.apps.calid_integrations.useQuery({
    variant: "conferencing",
    onlyInstalled: false,
  });

  const hasCalendarConnected = (calendarApps?.items?.length || 0) > 0;
  const hasNonDefaultConferencingConnected =
    conferencingApps?.items?.some((app) => app.userCredentialIds.length > 0 && app.slug !== "jitsi") || false;

  const [publicLink, setPublicLink] = useState("");

  useEffect(() => {
    if (username && typeof window !== "undefined") {
      setPublicLink(`${window.location.origin}/${username}`);
    }
  }, [username]);

  const mutation = trpc.viewer.me.calid_updateProfile.useMutation({
    onSuccess: (data) => {
      const newFormSubmittedForYear = data.metadata?.isProUser?.formSubmittedForYear || 0;
      const newFirstYearClaimDate = data.metadata?.isProUser?.firstYearClaimDate;
      setUserMetadata((prev) => ({
        ...prev,
        isProUser: {
          formSubmittedForYear: newFormSubmittedForYear,
          firstYearClaimDate: newFirstYearClaimDate,
        },
      }));

      if (newFormSubmittedForYear >= 2) {
        setShowVerificationDialog(true);
        setShowTallyForm(false);
      }
    },
  });

  const handleClaimFirstYear = () => {
    if (formSubmittedForYear < 1) {
      const firstYearClaimDate = new Date().toISOString();
      mutation.mutate({
        metadata: {
          isProUser: {
            ...userMetadata.isProUser,
            formSubmittedForYear: 1,
            firstYearClaimDate: firstYearClaimDate,
          },
        },
      });
      setShowStepsDialog(true);
    }
  };

  const handleTallySubmission = (formSubmittedForYear: number) => {
    mutation.mutate({
      metadata: {
        isProUser: {
          ...userMetadata.isProUser,
          formSubmittedForYear: formSubmittedForYear + 1,
        },
      },
    });
  };

  const handleCopyLink = () => {
    if (publicLink) {
      copyToClipboard(publicLink, {
        onSuccess: () => {
          triggerToast("Link copied!", "success");
        },
        onFailure: () => {
          triggerToast("Failed to copy link", "error");
        },
      });
    }
  };

  return (
    <div className="flex w-full flex-col items-center justify-center px-2">
      {!showTallyForm && (
        <div className="my-8 flex flex-col items-center justify-center text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <Icon name="sparkles" className="h-8 w-8 text-blue-500" />
          </div>
          <h1 className="text-default text-3xl font-bold">Get 2 Years of Cal ID Pro</h1>
          <p className="text-default text-lg">
            Simply complete these 2 steps and claim your Pro plan in minutes!
          </p>
        </div>
      )}
      {showTallyForm ? (
        <div className="w-full max-w-4xl">
          <TallyForm
            formSubmittedForYear={formSubmittedForYear}
            userEmail={userEmail}
            onSubmission={() => handleTallySubmission(formSubmittedForYear)}
          />
        </div>
      ) : (
        <div className="grid w-full max-w-6xl grid-cols-1 gap-8 md:grid-cols-2">
          <div className="group relative h-80 w-full">
            <div
              className={`bg-default border-default relative flex h-full w-full flex-col items-center justify-center rounded-2xl border p-8 shadow-xl transition-all duration-300 ease-out ${
                formSubmittedForYear >= 1 && uniqueAttendeesData?.isEligible
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer group-hover:-translate-x-1.5 group-hover:-translate-y-3.5 group-hover:scale-105 group-hover:transform"
              }`}
              style={{
                boxShadow: "0 18px 40px rgba(10,10,20,0.18)",
              }}>
              {formSubmittedForYear >= 1 && (
                <span
                  className="absolute right-4 top-4 cursor-pointer text-sm text-blue-600 underline hover:text-blue-700"
                  onClick={() => setShowStepsDialog(true)}>
                  How to?
                </span>
              )}
              <div
                className={`mb-4 flex h-16 w-16 items-center justify-center rounded-lg ${
                  formSubmittedForYear >= 1 && uniqueAttendeesData?.isEligible
                    ? "bg-green-100"
                    : "bg-blue-100"
                }`}>
                {formSubmittedForYear >= 1 && uniqueAttendeesData?.isEligible ? (
                  <Icon name="check" className="h-8 w-8 text-green-500" />
                ) : (
                  <svg
                    className="h-8 w-8 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                    />
                  </svg>
                )}
              </div>
              <h3 className="text-default text-xl font-bold">
                {formSubmittedForYear >= 1 && uniqueAttendeesData?.isEligible
                  ? "First Year Pro"
                  : "Unlock 1st Year"}
              </h3>
              {formSubmittedForYear >= 1 && !uniqueAttendeesData?.isEligible ? (
                <div className="mb-6 flex w-full flex-col items-center justify-center space-y-4">
                  <p className="text-default text-sm">Get bookings with 3 unique users to unlock</p>
                  <div className="w-full max-w-[200px] space-y-2">
                    {isLoadingAttendees ? (
                      <div className="flex w-full flex-col items-center justify-center gap-1">
                        <SkeletonText className="h-2 w-full rounded-full" />
                        <SkeletonText className="h-3 w-24" />
                      </div>
                    ) : (
                      <div className="flex w-full flex-col items-center justify-center gap-1">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                          <div
                            className={`h-full transition-all duration-300 ${
                              (uniqueAttendeesData?.uniqueAttendeesCount || 0) >=
                              (uniqueAttendeesData?.requiredCount || 3)
                                ? "bg-green-500"
                                : "bg-blue-500"
                            }`}
                            style={{
                              width: `${Math.min(
                                ((uniqueAttendeesData?.uniqueAttendeesCount || 0) /
                                  (uniqueAttendeesData?.requiredCount || 3)) *
                                  100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                        <div className="text-default flex justify-between text-xs">
                          <span>
                            {uniqueAttendeesData?.uniqueAttendeesCount || 0} /{" "}
                            {uniqueAttendeesData?.requiredCount || 3} unique bookers
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-default mb-6">Unlock all premium features for one year</p>
              )}
              {formSubmittedForYear >= 1 && uniqueAttendeesData?.isEligible ? (
                <Button className="text-center" disabled>
                  Already Claimed
                </Button>
              ) : formSubmittedForYear < 1 ? (
                <Button onClick={handleClaimFirstYear} className="text-center" disabled={mutation.isPending}>
                  Claim
                </Button>
              ) : null}
            </div>
          </div>

          <div className="group relative h-80 w-full">
            <div
              className={`bg-default border-default flex h-full w-full flex-col items-center justify-center rounded-2xl border p-8 shadow-xl transition-all duration-300 ease-out ${
                formSubmittedForYear < 1 || !uniqueAttendeesData?.isEligible || formSubmittedForYear >= 2
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer group-hover:-translate-x-1.5 group-hover:-translate-y-3.5 group-hover:scale-105 group-hover:transform"
              }`}
              style={{
                boxShadow: "0 18px 40px rgba(10,10,20,0.18)",
              }}>
              <div
                className={`mb-4 flex h-16 w-16 items-center justify-center rounded-lg ${
                  formSubmittedForYear >= 2 ? "bg-green-100" : "bg-blue-100"
                }`}>
                {formSubmittedForYear >= 2 ? (
                  <Icon name="check" className="h-8 w-8 text-green-500" />
                ) : (
                  <svg
                    className="h-8 w-8 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                    />
                  </svg>
                )}
              </div>
              <h3 className="text-default text-xl font-bold">
                {formSubmittedForYear >= 2 ? "Second Year Pro" : "Unlock 2nd Year"}
              </h3>
              <p className="text-default mb-6">
                {formSubmittedForYear >= 2 ? "Already Claimed" : "Unlock all premium features for two years"}
              </p>
              <Button
                onClick={() =>
                  formSubmittedForYear >= 1 &&
                  uniqueAttendeesData?.isEligible &&
                  formSubmittedForYear < 2 &&
                  setShowTallyForm(true)
                }
                className="text-center"
                disabled={
                  mutation.isPending ||
                  formSubmittedForYear < 1 ||
                  !uniqueAttendeesData?.isEligible ||
                  formSubmittedForYear >= 2
                }>
                {formSubmittedForYear >= 2
                  ? "Already Claimed"
                  : formSubmittedForYear < 1 || !uniqueAttendeesData?.isEligible
                  ? "Complete First Year"
                  : "Claim"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {!showTallyForm && (
        <div className="mt-12 w-full max-w-4xl">
          <div className="border-default rounded-2xl border p-8 shadow-lg">
            <div className="mb-8 flex items-center">
              <div className="mr-3 flex h-6 w-6 items-center justify-center">
                <Icon name="sparkles" className="h-8 w-8 text-blue-500" />
              </div>
              <h2 className="text-default text-xl font-bold">What&apos;s included in Pro?</h2>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="mr-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
                    <svg className="h-4 w-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-default">Unlimited Teams</span>
                </div>
                <div className="flex items-start">
                  <div className="mr-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
                    <svg className="h-4 w-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-default">API Access</span>
                </div>
                <div className="flex items-start">
                  <div className="mr-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
                    <svg className="h-4 w-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-default">Workflows</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="mr-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
                    <svg className="h-4 w-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-default">Routing Forms</span>
                </div>
                <div className="flex items-start">
                  <div className="mr-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
                    <svg className="h-4 w-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-default">Custom Branding</span>
                </div>
                <div className="flex items-start">
                  <div className="mr-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
                    <svg className="h-4 w-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-default">Advanced Analytics</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Steps Dialog */}
      <StepsDialog
        isOpen={showStepsDialog}
        onClose={() => setShowStepsDialog(false)}
        publicLink={publicLink}
        onCopyLink={handleCopyLink}
        hasCalendarConnected={hasCalendarConnected}
        hasConferencingConnected={hasNonDefaultConferencingConnected}
      />

      {/* Verification Dialog */}
      <VerificationDialog
        isOpen={showVerificationDialog}
        onClose={() => setShowVerificationDialog(false)}
        formSubmittedForYear={formSubmittedForYear}
      />
    </div>
  );
}

interface VerificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  formSubmittedForYear: number;
}

const VerificationDialog = ({ isOpen, onClose, formSubmittedForYear }: VerificationDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton>
        <div className="flex flex-col items-center space-y-6 py-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Icon name="check" className="h-8 w-8 text-green-600" />
          </div>

          <div className="space-y-4">
            <h3 className="text-default text-xl font-semibold">Your response has been submitted!</h3>

            <p className="text-default text-sm">
              Our team will verify your submission and your {formSubmittedForYear === 1 ? "1st" : "2nd"} year
              of Pro plan will be activated automatically. It typically takes 24-48 hours, keep an eye on your
              email inbox.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface StepsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  publicLink: string;
  onCopyLink: () => void;
  hasCalendarConnected: boolean;
  hasConferencingConnected: boolean;
}

const StepsDialog = ({
  isOpen,
  onClose,
  publicLink,
  onCopyLink,
  hasCalendarConnected,
  hasConferencingConnected,
}: StepsDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>How to book through Cal ID?</DialogTitle>
          <DialogDescription>
            Follow these steps for creating a new booking with your bookers.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="border-default rounded-lg border p-4">
            <div className="flex items-start gap-4">
              <div className="border-default flex h-8 w-8 shrink-0 items-center justify-center rounded-full border">
                <span className="text-default font-semibold">1</span>
              </div>
              <div className="flex flex-1 items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-default font-semibold">Connect Calendar</h3>
                  <p className="text-muted text-sm">
                    Connect your calendar to sync events and manage bookings
                  </p>
                </div>
                {hasCalendarConnected ? (
                  <span className="rounded-md border border-green-600 px-2 py-1 text-sm font-medium text-green-600">
                    Connected
                  </span>
                ) : (
                  <Link href="/apps/categories/calendar" target="_blank">
                    <Button variant="button" color="secondary">
                      Connect
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="border-default rounded-lg border p-4">
            <div className="flex items-start gap-4">
              <div className="border-default flex h-8 w-8 shrink-0 items-center justify-center rounded-full border">
                <span className="text-default font-semibold">2</span>
              </div>
              <div className="flex flex-1 items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-default font-semibold">Connect Conferencing App</h3>
                  <p className="text-muted text-sm">Connect a conferencing app to enable video meetings</p>
                </div>
                {hasConferencingConnected ? (
                  <span className="rounded-md border border-green-600 px-2 py-1 text-sm font-medium text-green-600">
                    Connected
                  </span>
                ) : (
                  <Link href="/apps/categories/conferencing" target="_blank">
                    <Button variant="button" color="secondary">
                      Connect
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="border-default rounded-lg border p-4">
            <div className="flex items-start gap-4">
              <div className="border-default flex h-8 w-8 shrink-0 items-center justify-center rounded-full border">
                <span className="text-default font-semibold">3</span>
              </div>
              <div className="flex-1">
                <h3 className="text-default font-semibold">Share Your Public Link</h3>
                <p className="text-muted text-sm">Share your booking link to get bookings from your users</p>
                {publicLink && (
                  <div className="mt-3 w-full">
                    <InputField
                      value={publicLink}
                      readOnly
                      isFullWidth
                      placeholder=""
                      addOnSuffix={
                        <div className="flex gap-2">
                          <Button
                            StartIcon="copy"
                            size="sm"
                            variant="icon"
                            color="minimal"
                            onClick={onCopyLink}
                            tooltip="Copy"
                          />
                          <Button
                            StartIcon="external-link"
                            size="sm"
                            variant="icon"
                            color="minimal"
                            onClick={() => window.open(publicLink, "_blank")}
                            tooltip="Preview URL"
                          />
                        </div>
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
