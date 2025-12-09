"use client";

import { SkeletonText, SkeletonContainer } from "@calcom/ui/components/skeleton";

export const OAuthClientsAdminSkeleton = () => {
  return (
    <SkeletonContainer>
      <div className="mb-4 flex justify-end">
        <div className="bg-emphasis h-9 w-36 rounded-md" />
      </div>
      <div className="border-subtle overflow-hidden rounded-lg border">
        <table className="w-full">
          <thead className="bg-subtle">
            <tr>
              <th className="px-4 py-3 text-left">
                <SkeletonText className="h-4 w-20" />
              </th>
              <th className="px-4 py-3 text-left">
                <SkeletonText className="h-4 w-20" />
              </th>
              <th className="px-4 py-3 text-left">
                <SkeletonText className="h-4 w-20" />
              </th>
              <th className="px-4 py-3 text-left">
                <SkeletonText className="h-4 w-16" />
              </th>
              <th className="px-4 py-3 text-left">
                <SkeletonText className="h-4 w-16" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-subtle divide-y">
            {[1, 2, 3].map((i) => (
              <tr key={i}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-emphasis h-8 w-8 rounded-full" />
                    <SkeletonText className="h-4 w-24" />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <SkeletonText className="h-4 w-40" />
                </td>
                <td className="px-4 py-3">
                  <SkeletonText className="h-4 w-24" />
                </td>
                <td className="px-4 py-3">
                  <SkeletonText className="h-5 w-16 rounded-full" />
                </td>
                <td className="px-4 py-3">
                  <div className="bg-emphasis h-8 w-8 rounded" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SkeletonContainer>
  );
};
