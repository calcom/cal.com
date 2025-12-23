import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Suspense } from "react";

import NoSSR from "@calcom/lib/components/NoSSR";
import { SkeletonText, SkeletonContainer } from "@calcom/ui/components/skeleton";

const SkeletonLoader = () => {
  return (
    <SkeletonContainer>
      <div className="divide-subtle mb-8 mt-6 stack-y-6">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
      </div>
    </SkeletonContainer>
  );
};

// Story component that mimics FlagListingView structure
const FlagListingViewStory = ({ showLoading = false }: { showLoading?: boolean }) => {
  return (
    <NoSSR>
      <Suspense fallback={<SkeletonLoader />}>
        {showLoading ? (
          <SkeletonLoader />
        ) : (
          <div className="text-default p-4">
            <p>Flag listing content would be rendered here.</p>
            <p className="text-subtle mt-2 text-sm">
              This story demonstrates the FlagListingView wrapper component with NoSSR and Suspense.
            </p>
          </div>
        )}
      </Suspense>
    </NoSSR>
  );
};

const meta = {
  title: "Features/Flags/FlagListingView",
  component: FlagListingViewStory,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[800px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FlagListingViewStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    showLoading: false,
  },
};

export const LoadingState: Story = {
  args: {
    showLoading: true,
  },
};

export const WithSkeleton: Story = {
  render: () => (
    <div className="w-[800px]">
      <SkeletonLoader />
    </div>
  ),
};
