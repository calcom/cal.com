"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@calcom/ui/components/button";
import { showToast } from "@calcom/ui/components/toast";

interface OptInContentProps {
  organizationId: number;
}

export function OptInContent({ organizationId }: OptInContentProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleOptIn = async () => {
    setIsLoading(true);
    try {
      // TODO: Call API to enable PBAC feature flag for the organization
      showToast("Successfully opted in to Roles & Permissions", "success");
      router.push("/settings/organizations/roles");
      router.refresh();
    } catch (error) {
      showToast("Failed to opt in to Roles & Permissions", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-subtle rounded-md p-6">
        <h3 className="text-emphasis mb-2 text-lg font-semibold">
          Introducing Roles & Permissions
        </h3>
        <p className="text-default mb-4">
          Take control of your organization's access management with our new Roles & Permissions
          feature. Create custom roles, define granular permissions, and ensure the right people have
          the right access.
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

        <Button onClick={handleOptIn} loading={isLoading}>
          Enable Roles & Permissions
        </Button>
      </div>
    </div>
  );
}
