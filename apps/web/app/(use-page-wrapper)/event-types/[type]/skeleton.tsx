"use client";

import { SkeletonButton, SkeletonContainer, SkeletonText } from "@calid/features/ui/components/skeleton";

import Shell from "@calcom/features/shell/Shell";

export const EventTypeEditPageSkeleton = () => {
  // Tab configuration matching the new event-type view
  const tabs = [
    { name: "Event Setup", icon: "settings", href: "#setup" },
    { name: "Availability", icon: "clock-2", href: "#availability" },
    { name: "Team", icon: "users", href: "#team" },
    { name: "Limits", icon: "shield", href: "#limits" },
    { name: "Advanced", icon: "zap", href: "#advanced" },
    { name: "Apps", icon: "blocks", href: "#apps" },
    { name: "Workflows", icon: "workflow", href: "#workflows" },
    { name: "Webhooks", icon: "webhook", href: "#webhooks" },
    { name: "Embed", icon: "clipboard", href: "#embed" },
  ];

  const ctaSkeleton = (
    <div className="flex items-center gap-2">
      <SkeletonButton className="h-9 w-9 rounded-md" />
      <SkeletonButton className="h-9 w-9 rounded-md" />
      <SkeletonButton className="h-9 w-9 rounded-md" />
      <div className="flex space-x-2 rtl:space-x-reverse">
        <SkeletonButton className="h-9 w-16 rounded-md" />
      </div>
    </div>
  );

  // Setup tab skeleton content
  const SetupTabSkeleton = () => (
    <div className="space-y-6">
      {/* Title and Description Section */}
      <SkeletonContainer className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="space-y-4">
          <SkeletonText className="h-6 w-48" />
          <SkeletonText className="h-4 w-96" />
          <div className="space-y-2">
            <SkeletonText className="h-10 w-full" />
            <SkeletonText className="h-10 w-full" />
          </div>
        </div>
      </SkeletonContainer>

      {/* Duration Section */}
      <SkeletonContainer className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="space-y-4">
          <SkeletonText className="h-6 w-32" />
          <div className="flex space-x-4">
            <SkeletonText className="h-10 w-24" />
            <SkeletonText className="h-10 w-32" />
          </div>
        </div>
      </SkeletonContainer>

      {/* Location Section */}
      <SkeletonContainer className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="space-y-4">
          <SkeletonText className="h-6 w-24" />
          <div className="space-y-2">
            <SkeletonText className="h-10 w-full" />
            <SkeletonText className="h-10 w-full" />
          </div>
        </div>
      </SkeletonContainer>
    </div>
  );

  return (
    <Shell heading="Edit Event" subtitle="Edit your event type" backPath="/event-types" CTA={ctaSkeleton}>
      <div className="bg-background min-h-screen">
        {/* Horizontal tabs skeleton */}
        <div className="border-b border-gray-200 bg-white">
          <div className="flex space-x-8">
            {tabs.map((tab, index) => (
              <div
                key={index}
                className="flex items-center space-x-2 border-b-2 border-transparent px-1 py-4">
                <SkeletonText className="h-4 w-4" />
                <SkeletonText className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>

        {/* Content skeleton */}
        <div className="bg-background py-4">
          <div className="mx-auto max-w-none">
            <SetupTabSkeleton />
          </div>
        </div>
      </div>
    </Shell>
  );
};
