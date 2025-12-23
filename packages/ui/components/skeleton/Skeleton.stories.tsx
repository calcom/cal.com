import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  Skeleton,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonContainer,
  SkeletonText,
  SelectSkeletonLoader,
} from "./Skeleton";

const meta = {
  component: SkeletonText,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof SkeletonText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Text: Story = {
  render: () => (
    <div className="space-y-2">
      <SkeletonText className="h-4 w-48" />
      <SkeletonText className="h-4 w-64" />
      <SkeletonText className="h-4 w-32" />
    </div>
  ),
};

export const Avatar: Story = {
  render: () => (
    <div className="flex gap-4">
      <SkeletonAvatar className="h-8 w-8" />
      <SkeletonAvatar className="h-10 w-10" />
      <SkeletonAvatar className="h-12 w-12" />
    </div>
  ),
};

export const Button: Story = {
  render: () => (
    <div className="space-y-4">
      <SkeletonButton className="h-9 w-24" />
      <SkeletonButton className="h-9 w-32" />
    </div>
  ),
};

export const Container: Story = {
  render: () => (
    <SkeletonContainer className="space-y-4">
      <div className="bg-emphasis h-4 w-48 rounded" />
      <div className="bg-emphasis h-4 w-64 rounded" />
      <div className="bg-emphasis h-4 w-40 rounded" />
    </SkeletonContainer>
  ),
};

export const SelectLoader: Story = {
  render: () => (
    <ul className="w-64 space-y-2">
      <SelectSkeletonLoader className="" />
      <SelectSkeletonLoader className="" />
      <SelectSkeletonLoader className="" />
    </ul>
  ),
};

export const SkeletonWrapper: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-subtle mb-1">Loading state (loading=true)</p>
        <Skeleton as="p" loading className="text-lg font-semibold">
          This text is loading
        </Skeleton>
      </div>
      <div>
        <p className="text-xs text-subtle mb-1">Loaded state (loading=false)</p>
        <Skeleton as="p" loading={false} className="text-lg font-semibold">
          This text is loaded
        </Skeleton>
      </div>
    </div>
  ),
};

export const CardSkeleton: Story = {
  render: () => (
    <div className="border-subtle w-80 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <SkeletonAvatar className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <SkeletonText className="h-4 w-32" />
          <SkeletonText className="h-3 w-24" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <SkeletonText className="h-3 w-full" />
        <SkeletonText className="h-3 w-full" />
        <SkeletonText className="h-3 w-3/4" />
      </div>
      <div className="mt-4 flex gap-2">
        <SkeletonButton className="h-8 w-20" />
        <SkeletonButton className="h-8 w-20" />
      </div>
    </div>
  ),
};

export const ListSkeleton: Story = {
  render: () => (
    <div className="w-80 space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border-subtle flex items-center gap-3 rounded-lg border p-3">
          <SkeletonAvatar className="h-8 w-8" />
          <div className="flex-1 space-y-1">
            <SkeletonText className="h-4 w-32" />
            <SkeletonText className="h-3 w-20" />
          </div>
          <SkeletonButton className="h-6 w-6" />
        </div>
      ))}
    </div>
  ),
};

export const FormSkeleton: Story = {
  render: () => (
    <div className="w-80 space-y-4">
      <div className="space-y-1">
        <SkeletonText className="h-4 w-16" />
        <SkeletonButton className="h-10 w-full" />
      </div>
      <div className="space-y-1">
        <SkeletonText className="h-4 w-20" />
        <SkeletonButton className="h-10 w-full" />
      </div>
      <div className="space-y-1">
        <SkeletonText className="h-4 w-24" />
        <SkeletonButton className="h-24 w-full" />
      </div>
      <div className="flex justify-end gap-2">
        <SkeletonButton className="h-9 w-20" />
        <SkeletonButton className="h-9 w-24" />
      </div>
    </div>
  ),
};
