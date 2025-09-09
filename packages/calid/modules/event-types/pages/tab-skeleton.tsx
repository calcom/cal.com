import React from "react";

// Skeleton components - inline implementation matching calid design system
export const SkeletonText = ({ className = "", ...props }: { className?: string; [key: string]: any }) => (
  <span
    className={`font-size-0 bg-emphasis inline-block animate-pulse rounded-md empty:before:inline-block empty:before:content-[''] ${className}`}
    {...props}
  />
);

export const SkeletonContainer = ({
  children,
  className = "",
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}) => (
  <div className={`animate-pulse ${className}`} {...props}>
    {children}
  </div>
);

// Tab-specific skeleton components
export const SetupTabSkeleton = () => (
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

export const AvailabilityTabSkeleton = () => (
  <div className="space-y-6">
    {/* Schedule Section */}
    <SkeletonContainer className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="space-y-4">
        <SkeletonText className="h-6 w-40" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SkeletonText className="h-10 w-full" />
          <SkeletonText className="h-10 w-full" />
        </div>
      </div>
    </SkeletonContainer>

    {/* Time Zone Section */}
    <SkeletonContainer className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="space-y-4">
        <SkeletonText className="h-6 w-32" />
        <SkeletonText className="h-10 w-full" />
      </div>
    </SkeletonContainer>
  </div>
);

export const LimitsTabSkeleton = () => (
  <div className="space-y-6">
    {/* Before/After Event Section */}
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <SkeletonContainer className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="space-y-4">
          <SkeletonText className="h-6 w-32" />
          <div className="space-y-2">
            <SkeletonText className="h-10 w-full" />
            <SkeletonText className="h-10 w-full" />
          </div>
        </div>
      </SkeletonContainer>
      <SkeletonContainer className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="space-y-4">
          <SkeletonText className="h-6 w-32" />
          <div className="space-y-2">
            <SkeletonText className="h-10 w-full" />
            <SkeletonText className="h-10 w-full" />
          </div>
        </div>
      </SkeletonContainer>
    </div>

    {/* Booking Limits Section */}
    <SkeletonContainer className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="space-y-4">
        <SkeletonText className="h-6 w-48" />
        <div className="space-y-2">
          <SkeletonText className="h-10 w-full" />
          <SkeletonText className="h-10 w-full" />
        </div>
      </div>
    </SkeletonContainer>
  </div>
);

export const AdvancedTabSkeleton = () => (
  <div className="space-y-6">
    {/* Calendar Settings */}
    <SkeletonContainer className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="space-y-4">
        <SkeletonText className="h-6 w-48" />
        <div className="space-y-2">
          <SkeletonText className="h-10 w-full" />
          <SkeletonText className="h-10 w-full" />
        </div>
      </div>
    </SkeletonContainer>

    {/* Booking Questions */}
    <SkeletonContainer className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="space-y-4">
        <SkeletonText className="h-6 w-40" />
        <SkeletonText className="h-4 w-64" />
        <div className="space-y-2">
          <SkeletonText className="h-10 w-full" />
          <SkeletonText className="h-10 w-full" />
        </div>
      </div>
    </SkeletonContainer>

    {/* Confirmation Settings */}
    <SkeletonContainer className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="space-y-4">
        <SkeletonText className="h-6 w-48" />
        <div className="space-y-2">
          <SkeletonText className="h-10 w-full" />
          <SkeletonText className="h-10 w-full" />
        </div>
      </div>
    </SkeletonContainer>
  </div>
);

export const AppsTabSkeleton = () => (
  <div className="space-y-6">
    {/* Installed Apps */}
    <SkeletonContainer className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="space-y-4">
        <SkeletonText className="h-6 w-40" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <SkeletonText className="h-4 w-24" />
              <SkeletonText className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonContainer>
  </div>
);

export const WorkflowsTabSkeleton = () => (
  <div className="space-y-6">
    {/* Workflows Section */}
    <SkeletonContainer className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="space-y-4">
        <SkeletonText className="h-6 w-32" />
        <div className="space-y-2">
          <SkeletonText className="h-10 w-full" />
          <SkeletonText className="h-10 w-full" />
        </div>
      </div>
    </SkeletonContainer>
  </div>
);

export const WebhooksTabSkeleton = () => (
  <div className="space-y-6">
    {/* Webhooks Section */}
    <SkeletonContainer className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="space-y-4">
        <SkeletonText className="h-6 w-32" />
        <div className="space-y-2">
          <SkeletonText className="h-10 w-full" />
          <SkeletonText className="h-10 w-full" />
        </div>
      </div>
    </SkeletonContainer>
  </div>
);

export const EmbedTabSkeleton = () => (
  <div className="space-y-6">
    {/* Embed Code Section */}
    <SkeletonContainer className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="space-y-4">
        <SkeletonText className="h-6 w-32" />
        <SkeletonText className="h-20 w-full" />
        <SkeletonText className="h-10 w-32" />
      </div>
    </SkeletonContainer>
  </div>
);

export const DefaultTabSkeleton = () => (
  <div className="space-y-6">
    {Array.from({ length: 3 }).map((_, index) => (
      <SkeletonContainer key={index} className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="space-y-4">
          <SkeletonText className="h-6 w-48" />
          <div className="space-y-2">
            <SkeletonText className="h-10 w-full" />
            <SkeletonText className="h-10 w-full" />
          </div>
        </div>
      </SkeletonContainer>
    ))}
  </div>
);

// Main skeleton component that renders based on active tab
export const TabSkeleton = ({ activeTab }: { activeTab: string }) => {
  switch (activeTab) {
    case "setup":
      return <SetupTabSkeleton />;
    case "availability":
      return <AvailabilityTabSkeleton />;
    case "limits":
      return <LimitsTabSkeleton />;
    case "advanced":
      return <AdvancedTabSkeleton />;
    case "apps":
      return <AppsTabSkeleton />;
    case "workflows":
      return <WorkflowsTabSkeleton />;
    case "webhooks":
      return <WebhooksTabSkeleton />;
    case "embed":
      return <EmbedTabSkeleton />;
    default:
      return <DefaultTabSkeleton />;
  }
};
