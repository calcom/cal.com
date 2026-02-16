"use client";

import { TallyForm } from "@calid/features/modules/claim-pro/TallyForm";
import { Button } from "@calid/features/ui/components/button";
import { Dialog, DialogContent } from "@calid/features/ui/components/dialog";
import { Icon } from "@calid/features/ui/components/icon";
import { SkeletonText } from "@calid/features/ui/components/skeleton";
import { useSession } from "next-auth/react";
import React, { useState } from "react";

import { trpc } from "@calcom/trpc/react";

export interface PageProps {
  userId: number;
  userMetadata: {
    isProUser?: {
      yearClaimed?: number;
      formSubmittedForYear?: number;
      validTillDate?: string;
      verifield?: boolean;
    };
  };
}

export default function Page({ userMetadata: initialUserMetadata }: PageProps) {
  const [userMetadata, setUserMetadata] = useState(initialUserMetadata);
  const [showTallyForm, setShowTallyForm] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const formSubmittedForYear = userMetadata.isProUser?.formSubmittedForYear || 0;
  const { data: session } = useSession();
  const utils = trpc.useUtils();
  const userEmail = session?.user?.email;

  // Fetch unique attendees count for experimental first year feature
  const { data: uniqueAttendeesData, isLoading: isLoadingUniqueAttendees } =
    trpc.viewer.me.getUniqueAttendeesCount.useQuery(undefined, {
      refetchOnWindowFocus: true,
    });

  const experimentalFirstYearEligible = uniqueAttendeesData?.isEligible || false;
  const uniqueAttendeesCount = uniqueAttendeesData?.uniqueAttendeesCount || 0;
  const requiredUniqueAttendees = uniqueAttendeesData?.requiredCount || 3;
  const yearClaimed = userMetadata.isProUser?.yearClaimed || 0;
  const hasAlreadyClaimed = yearClaimed >= 1 || formSubmittedForYear >= 1;
  const canAutoClaimFirstYear = experimentalFirstYearEligible && !hasAlreadyClaimed;

  // Show original card if user has already claimed, otherwise show experimental card
  const showOriginalCard = hasAlreadyClaimed;
  const firstYearClaimed = formSubmittedForYear >= 1 || (experimentalFirstYearEligible && !hasAlreadyClaimed);

  const mutation = trpc.viewer.me.calid_updateProfile.useMutation({
    onSuccess: (data) => {
      const newFormSubmittedForYear =
        data.metadata?.isProUser?.formSubmittedForYear || userMetadata.isProUser?.formSubmittedForYear || 0;
      setUserMetadata((prev) => ({
        ...prev,
        isProUser: {
          formSubmittedForYear: newFormSubmittedForYear,
        },
      }));

      setShowVerificationDialog(true);
      if (newFormSubmittedForYear >= 2) {
        setShowTallyForm(false);
      }
    },
  });

  // Mutation to claim first year directly when eligible via unique attendees
  const claimFirstYearMutation = trpc.viewer.me.calid_updateProfile.useMutation({
    onSuccess: async (data) => {
      const updatedMetadata = data.metadata?.isProUser || userMetadata.isProUser;
      setUserMetadata((prev) => ({
        ...prev,
        isProUser: {
          ...prev.isProUser,
          ...updatedMetadata,
        },
      }));
      await utils.viewer.me.invalidate();
    },
  });

  React.useEffect(() => {
    // Only auto-claim for new users who haven't claimed before
    if (canAutoClaimFirstYear) {
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      const validTillDate = expiryDate.toISOString();

      claimFirstYearMutation.mutate({
        metadata: {
          isProUser: {
            ...userMetadata.isProUser,
            formSubmittedForYear: 1,
            yearClaimed: 1,
            validTillDate: validTillDate,
            verified: true,
          },
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAutoClaimFirstYear]);

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
          {/* First Year Card - Show original card if already claimed, otherwise show experimental card */}
          {showOriginalCard ? (
            // Original card with TallyForm button
            <div className="group relative h-80 w-full">
              <div
                className={`bg-default border-default flex h-full w-full flex-col items-center justify-center rounded-2xl border p-8 shadow-xl transition-all duration-300 ease-out ${
                  formSubmittedForYear >= 1
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer group-hover:-translate-x-1.5 group-hover:-translate-y-3.5 group-hover:scale-105 group-hover:transform"
                }`}
                style={{
                  boxShadow: "0 18px 40px rgba(10,10,20,0.18)",
                }}>
                <div
                  className={`mb-4 flex h-16 w-16 items-center justify-center rounded-lg ${
                    formSubmittedForYear >= 1 ? "bg-green-100" : "bg-blue-100"
                  }`}>
                  {formSubmittedForYear >= 1 ? (
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
                  {formSubmittedForYear >= 1 ? "First Year Pro" : "Unlock 1st Year"}
                </h3>
                <p className="text-default mb-6">
                  {formSubmittedForYear >= 1 ? "Already Claimed" : "Unlock all premium features for one year"}
                </p>
                <Button
                  onClick={() => formSubmittedForYear < 1 && setShowTallyForm(true)}
                  className="text-center"
                  disabled={mutation.isPending || formSubmittedForYear >= 1}>
                  {formSubmittedForYear >= 1 ? "Already Claimed" : "Claim"}
                </Button>
              </div>
            </div>
          ) : (
            // Experimental card with progress bar
            <div className="group relative h-80 w-full">
              <div
                className={`bg-default border-default flex h-full w-full flex-col items-center justify-center rounded-2xl border p-8 shadow-xl transition-all duration-300 ease-out ${
                  firstYearClaimed ? "cursor-not-allowed opacity-60" : "cursor-default"
                }`}
                style={{
                  boxShadow: "0 18px 40px rgba(10,10,20,0.18)",
                }}>
                <div
                  className={`mb-4 flex h-16 w-16 items-center justify-center rounded-lg ${
                    firstYearClaimed ? "bg-green-100" : "bg-blue-100"
                  }`}>
                  {firstYearClaimed ? (
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
                  {firstYearClaimed ? "First Year Pro" : "Unlock 1st Year"}
                </h3>
                <p className="text-default mb-4 text-center">
                  {firstYearClaimed
                    ? "Already Claimed"
                    : "Get 3 bookings with unique bookers to unlock your first year"}
                </p>
                {!isLoadingUniqueAttendees ? (
                  <div className="flex w-full max-w-[200px] flex-col items-center justify-center gap-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`h-full transition-all duration-300 ${
                          firstYearClaimed ? "bg-green-500" : "bg-blue-500"
                        }`}
                        style={{
                          width: `${Math.min((uniqueAttendeesCount / requiredUniqueAttendees) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <div className="text-default flex justify-between text-xs">
                      <span>
                        {uniqueAttendeesCount} / {requiredUniqueAttendees} unique bookers
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex w-full max-w-[200px] flex-col items-center justify-center gap-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                      <SkeletonText className="block h-full w-1/3" style={{ display: "block" }} />
                    </div>
                    <SkeletonText className="h-4 w-24" />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="group relative h-80 w-full">
            <div
              className={`bg-default border-default flex h-full w-full flex-col items-center justify-center rounded-2xl border p-8 shadow-xl transition-all duration-300 ease-out ${
                !firstYearClaimed || formSubmittedForYear >= 2
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
                onClick={() => firstYearClaimed && formSubmittedForYear < 2 && setShowTallyForm(true)}
                className="text-center"
                disabled={mutation.isPending || !firstYearClaimed || formSubmittedForYear >= 2}>
                {formSubmittedForYear >= 2
                  ? "Already Claimed"
                  : !firstYearClaimed
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
              Your submission is currently being reviewed. Once approved, your{" "}
              {formSubmittedForYear === 1 ? "1st" : "2nd"} year of Pro plan will be activated automatically.
              <br />
              Please note that approval timelines vary by platform and may take anywhere from a few days to up
              to two weeks.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
