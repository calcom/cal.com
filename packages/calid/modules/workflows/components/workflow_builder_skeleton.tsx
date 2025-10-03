"use client";

import { cn } from "@calid/features/lib/cn";
import { Card, CardContent, CardHeader } from "@calid/features/ui/components/card";
import React from "react";

type SkeletonBaseProps = {
  className?: string;
};

const SkeletonText: React.FC<SkeletonBaseProps & { invisible?: boolean; style?: React.CSSProperties }> = ({
  className = "",
  invisible = false,
  style,
}) => {
  return (
    <span
      style={style}
      className={cn(
        `bg-emphasis inline-block animate-pulse rounded-md empty:before:inline-block empty:before:content-['']`,
        className,
        invisible ? "invisible" : ""
      )}
    />
  );
};

const SkeletonButton: React.FC<SkeletonBaseProps> = ({ className }) => {
  return <div className={cn(`bg-emphasis animate-pulse rounded-md`, className)} />;
};

const SkeletonInput: React.FC<SkeletonBaseProps> = ({ className }) => {
  return <div className={cn(`bg-emphasis animate-pulse rounded-md border`, className)} />;
};

const SkeletonSelect: React.FC<SkeletonBaseProps> = ({ className }) => {
  return <div className={cn(`bg-emphasis animate-pulse rounded-md border`, className)} />;
};

const SkeletonCard: React.FC<SkeletonBaseProps & { children: React.ReactNode }> = ({
  className,
  children,
}) => {
  return <Card className={cn(`animate-pulse`, className)}>{children}</Card>;
};

export const WorkflowBuilderSkeleton: React.FC = () => {
  return (
    <div className="bg-card flex justify-center p-6 p-8">
      <div className="bg-card mx-auto w-full p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Workflow name section skeleton */}
          <div className="bg-card w-full space-y-6 rounded-lg border p-6">
            <div className="space-y-6">
              {/* Workflow name input skeleton */}
              <div>
                <SkeletonText className="mb-2 h-4 w-32" />
                <SkeletonInput className="h-10 w-full" />
              </div>

              {/* Event type selection skeleton */}
              <div>
                <SkeletonText className="mb-2 h-4 w-48" />
                <SkeletonButton className="h-10 w-full" />
              </div>
            </div>
          </div>

          {/* Trigger section skeleton */}
          <SkeletonCard>
            <CardHeader>
              <SkeletonText className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <SkeletonSelect className="h-10 w-full" />
              </div>
              <div className="space-y-4">
                <SkeletonText className="h-4 w-64" />
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="bg-emphasis h-4 w-4 animate-pulse rounded" />
                    <SkeletonText className="h-4 w-48" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="bg-emphasis h-4 w-4 animate-pulse rounded" />
                    <div className="flex flex-1 items-center space-x-2">
                      <SkeletonInput className="h-10 w-20" />
                      <SkeletonSelect className="h-10 w-24" />
                      <SkeletonText className="h-4 w-32" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </SkeletonCard>

          {/* Actions section skeleton */}
          <SkeletonCard>
            <CardHeader>
              <SkeletonText className="h-6 w-20" />
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Action step skeleton */}
              <Card className="border">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-1 items-center space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-100">
                        <SkeletonText className="h-4 w-4" />
                      </div>
                      <SkeletonSelect className="h-10 w-48" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <SkeletonButton className="h-8 w-8" />
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
                    {/* Phone/Email input skeleton */}
                    <div className="bg-default rounded-md p-4">
                      <SkeletonText className="mb-2 h-4 w-24" />
                      <div className="flex">
                        <SkeletonInput className="h-10 flex-1" />
                        <SkeletonButton className="ml-2 h-10 w-24" />
                      </div>
                    </div>

                    {/* Sender configuration skeleton */}
                    <div className="bg-default rounded-md p-4">
                      <SkeletonText className="mb-2 h-4 w-20" />
                      <SkeletonInput className="h-10 w-full" />
                    </div>

                    {/* Template selection skeleton */}
                    <div className="mt-5">
                      <SkeletonText className="mb-2 h-4 w-32" />
                      <SkeletonSelect className="h-10 w-full" />
                    </div>

                    {/* Message content skeleton */}
                    <div className="bg-default rounded-md p-4">
                      {/* Email subject skeleton */}
                      <div className="mb-6">
                        <div className="mb-2 flex items-center justify-between">
                          <SkeletonText className="h-4 w-24" />
                          <SkeletonButton className="h-6 w-6" />
                        </div>
                        <SkeletonInput className="h-16 w-full" />
                      </div>

                      {/* Message body skeleton */}
                      <div className="mb-2">
                        <SkeletonText className="h-4 w-24" />
                      </div>
                      <div className="rounded-md border p-4">
                        <SkeletonText className="h-32 w-full" />
                      </div>

                      {/* Include calendar event checkbox skeleton */}
                      <div className="mt-2 flex items-center space-x-2">
                        <div className="bg-emphasis h-4 w-4 animate-pulse rounded" />
                        <SkeletonText className="h-4 w-40" />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Add action button skeleton */}
              <SkeletonButton className="h-10 w-full border-2 border-dashed" />
            </CardContent>
          </SkeletonCard>
        </div>
      </div>
    </div>
  );
};

export default WorkflowBuilderSkeleton;
