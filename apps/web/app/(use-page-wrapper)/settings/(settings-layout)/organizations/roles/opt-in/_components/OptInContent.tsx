"use client";

import { useRouter } from "next/navigation";

import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { showToast } from "@calcom/ui/components/toast";

interface OptInContentProps {
  revalidateRolesPath: () => Promise<void>;
}

export function OptInContent({ revalidateRolesPath }: OptInContentProps) {
  const router = useRouter();
  const enablePbacMutation = trpc.viewer.pbac.enablePbac.useMutation({
    onSuccess: async () => {
      showToast("Successfully opted in to Roles & Permissions", "success");
      await revalidateRolesPath();
      router.push("/settings/organizations/roles");
    },
    onError: (error) => {
      showToast(error.message || "Failed to opt in to Roles & Permissions", "error");
    },
  });

  const handleOptIn = () => {
    enablePbacMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="bg-subtle rounded-md p-6">
        <h3 className="text-emphasis mb-2 text-lg font-semibold">Introducing Roles & Permissions</h3>
        <p className="text-default mb-4">
          Take control of your organization's access management with our new Roles & Permissions feature.
          Create custom roles, define granular permissions, and ensure the right people have the right access.
        </p>

        <div className="mb-6 space-y-3">
          <h4 className="text-emphasis font-medium">Key Features:</h4>
          <ul className="text-default list-inside list-disc space-y-2">
            <li>Create custom roles tailored to your organization's needs</li>
            <li>Define granular permissions for different resources</li>
            <li>Assign roles to team members for better access control</li>
            <li>Manage organization-wide security settings</li>
          </ul>
        </div>

        <Button onClick={handleOptIn} loading={enablePbacMutation.isPending}>
          Enable Roles & Permissions
        </Button>
      </div>
    </div>
  );
}
