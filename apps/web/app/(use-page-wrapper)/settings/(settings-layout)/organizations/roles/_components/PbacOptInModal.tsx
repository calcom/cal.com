"use client";

import { useRouter } from "next/navigation";

import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent } from "@calcom/ui/components/dialog";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

interface PbacOptInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revalidateRolesPath: () => Promise<void>;
}

export function PbacOptInModal({ open, onOpenChange, revalidateRolesPath }: PbacOptInModalProps) {
  const router = useRouter();
  const enablePbacMutation = trpc.viewer.pbac.enablePbac.useMutation({
    onSuccess: async () => {
      showToast("Successfully enabled PBAC for your organization", "success");
      await revalidateRolesPath();
      onOpenChange(false);
      router.refresh();
    },
    onError: (error) => {
      showToast(error.message || "Failed to enable PBAC for your organization", "error");
    },
  });

  const handleOptIn = () => {
    enablePbacMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        enableOverflow
        type={undefined}
        className="max-w-[468px] p-6"
        preventCloseOnOutsideClick={true}>
        <div className="flex flex-col items-center gap-8">
          {/* Header Section */}
          <div className="flex w-full flex-col items-center gap-6">
            {/* Cal.com Logo */}
            <div className="flex items-center justify-center">
              <Icon name="cal" className="text-emphasis h-5 w-20" />
            </div>

            {/* Illustration with User Icons */}
            <div className="relative flex h-28 w-full items-center justify-center">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                {/* Concentric circles */}
                <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gray-200 opacity-40" />
                <div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gray-200 opacity-50" />
                <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gray-200 opacity-60" />
                <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gray-200 opacity-70" />

                {/* Center logo */}
                <div className="bg-muted absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full">
                  <Icon name="cal" className="text-emphasis h-4 w-8" />
                </div>

                {/* User icons positioned around the center */}
                <div className="bg-muted absolute -right-16 top-5 flex h-7 w-7 items-center justify-center rounded-full shadow-md">
                  <Icon name="user" className="text-subtle h-4 w-4" />
                </div>
                <div className="bg-muted absolute -right-12 -top-12 flex h-7 w-7 items-center justify-center rounded-full shadow-md">
                  <Icon name="user" className="text-subtle h-4 w-4" />
                </div>
                <div className="bg-muted absolute -right-12 bottom-0 flex h-7 w-7 items-center justify-center rounded-full shadow-md">
                  <Icon name="user" className="text-subtle h-4 w-4" />
                </div>
                <div className="bg-muted absolute -left-20 top-1 flex h-7 w-7 items-center justify-center rounded-full shadow-md">
                  <Icon name="user" className="text-subtle h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Title and Description */}
            <div className="flex w-full flex-col items-center gap-1 text-center">
              <h2 className="font-cal text-emphasis text-xl font-semibold">
                Enable PBAC for your organization
              </h2>
              <p className="text-default text-sm">
                We're excited to announce PBAC, a fully customisable role solution for your members.
              </p>
            </div>
          </div>

          {/* Benefits List */}
          <div className="bg-subtle w-full space-y-px rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-default flex gap-3 p-3">
              <div className="bg-subtle flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
                <Icon name="shield-check" className="text-subtle h-5 w-5" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-emphasis text-sm font-semibold">Custom roles</p>
                <p className="text-subtle text-sm">Create roles tailored to your organization's needs</p>
              </div>
            </div>

            <div className="bg-default flex gap-3 p-3">
              <div className="bg-subtle flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
                <Icon name="lock" className="text-subtle h-5 w-5" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-emphasis text-sm font-semibold">Granular permissions</p>
                <p className="text-subtle text-sm">
                  Define precise access controls for different resources
                </p>
              </div>
            </div>

            <div className="bg-default flex gap-3 p-3">
              <div className="bg-subtle flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
                <Icon name="users" className="text-subtle h-5 w-5" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-emphasis text-sm font-semibold">Team member assignment</p>
                <p className="text-subtle text-sm">
                  Assign roles to team members for better access control
                </p>
              </div>
            </div>

            <div className="bg-default flex gap-3 p-3">
              <div className="bg-subtle flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
                <Icon name="shield" className="text-subtle h-5 w-5" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-emphasis text-sm font-semibold">Enhanced security</p>
                <p className="text-subtle text-sm">Manage organization-wide security settings</p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex w-full flex-col items-center justify-center">
            <Button
              onClick={handleOptIn}
              loading={enablePbacMutation.isPending}
              className="w-full"
              EndIcon="arrow-right">
              Enable PBAC
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
