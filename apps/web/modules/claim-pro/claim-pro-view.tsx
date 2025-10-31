"use client";

import { TallyForm } from "@calid/features/modules/claim-pro/TallyForm";
import { Button } from "@calid/features/ui/components/button";
import { Dialog, DialogContent } from "@calid/features/ui/components/dialog";
import { Icon } from "@calid/features/ui/components/icon";
import { useSession } from "next-auth/react";
import React, { useState } from "react";

import dayjs from "@calcom/dayjs";
import { trpc } from "@calcom/trpc/react";

export interface PageProps {
  userId: number;
  userMetadata: {
    isProUser?: {
      yearClaimed?: number;
      validTillDate?: string;
    };
  };
}

export default function Page({ userMetadata: initialUserMetadata }: PageProps) {
  const [userMetadata, setUserMetadata] = useState(initialUserMetadata);
  const [showTallyForm, setShowTallyForm] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const yearClaimed = userMetadata.isProUser?.yearClaimed || 0;
  const { data: session } = useSession();
  const userEmail = session?.user?.email;

  const mutation = trpc.viewer.me.calid_updateProfile.useMutation({
    onSuccess: (data) => {
      setUserMetadata((prev) => ({
        ...prev,
        isProUser: {
          yearClaimed: data.metadata?.isProUser?.yearClaimed || prev.isProUser?.yearClaimed,
          validTillDate: data.metadata?.isProUser?.validTillDate || prev.isProUser?.validTillDate,
        },
      }));
    },
  });

  const handleTallySubmission = (yearClaimed: number) => {
    mutation.mutate({
      metadata: {
        isProUser: {
          yearClaimed: yearClaimed + 1,
          validTillDate: dayjs()
            .utc()
            .add(yearClaimed + 1, "years")
            .toISOString(),
          verified: false,
        },
      },
    });
    if (yearClaimed === 1) {
      setShowTallyForm(false);
      setShowVerificationDialog(true);
    } else {
      setShowVerificationDialog(true);
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
            yearClaimed={yearClaimed}
            userEmail={userEmail}
            onSubmission={() => handleTallySubmission(yearClaimed)}
          />
        </div>
      ) : (
        <div className="grid w-full max-w-6xl grid-cols-1 gap-8 md:grid-cols-2">
          <div className="group relative h-80 w-full">
            <div
              className={`bg-default border-default flex h-full w-full flex-col items-center justify-center rounded-2xl border p-8 shadow-xl transition-all duration-300 ease-out ${
                yearClaimed >= 1
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer group-hover:-translate-x-1.5 group-hover:-translate-y-3.5 group-hover:scale-105 group-hover:transform"
              }`}
              style={{
                boxShadow: "0 18px 40px rgba(10,10,20,0.18)",
              }}>
              <div
                className={`mb-4 flex h-16 w-16 items-center justify-center rounded-lg ${
                  yearClaimed >= 1 ? "bg-green-100" : "bg-blue-100"
                }`}>
                {yearClaimed >= 1 ? (
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
                {yearClaimed >= 1 ? "First Year Pro" : "Unlock 1st Year"}
              </h3>
              <p className="text-default mb-6">
                {yearClaimed >= 1 ? "Already Claimed" : "Unlock all premium features for one year"}
              </p>
              <Button
                onClick={() => yearClaimed < 1 && setShowTallyForm(true)}
                className="text-center"
                disabled={mutation.isPending || yearClaimed >= 1}>
                {yearClaimed >= 1 ? "Already Claimed" : "Claim"}
              </Button>
            </div>
          </div>

          <div className="group relative h-80 w-full">
            <div
              className={`bg-default border-default flex h-full w-full flex-col items-center justify-center rounded-2xl border p-8 shadow-xl transition-all duration-300 ease-out ${
                yearClaimed < 1 || yearClaimed > 1
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer group-hover:-translate-x-1.5 group-hover:-translate-y-3.5 group-hover:scale-105 group-hover:transform"
              }`}
              style={{
                boxShadow: "0 18px 40px rgba(10,10,20,0.18)",
              }}>
              <div
                className={`mb-4 flex h-16 w-16 items-center justify-center rounded-lg ${
                  yearClaimed >= 2 ? "bg-green-100" : "bg-blue-100"
                }`}>
                {yearClaimed >= 2 ? (
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
                {yearClaimed >= 2 ? "Second Year Pro" : "Unlock 2nd Year"}
              </h3>
              <p className="text-default mb-6">
                {yearClaimed >= 2 ? "Already Claimed" : "Unlock all premium features for two years"}
              </p>
              <Button
                onClick={() => yearClaimed >= 1 && yearClaimed < 2 && setShowTallyForm(true)}
                className="text-center"
                disabled={mutation.isPending || yearClaimed < 1 || yearClaimed >= 2}>
                {yearClaimed >= 2 ? "Already Claimed" : yearClaimed < 1 ? "Complete First Year" : "Claim"}
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
        yearClaimed={yearClaimed}
      />
    </div>
  );
}

interface VerificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  yearClaimed: number;
}

const VerificationDialog = ({ isOpen, onClose, yearClaimed }: VerificationDialogProps) => {
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
              Our team will verify your submission and your {yearClaimed === 1 ? "1st" : "2nd"} year of Pro
              plan will be activated automatically. It typically takes 24-48 hours, keep an eye on your email
              inbox.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
