"use client";

import { useState, useEffect } from "react";

import ReferralClient from "@calcom/features/dub/ReferralClient";
import { SkeletonText, SkeletonButton, SkeletonAvatar, SkeletonContainer } from "@calcom/ui";

// Assuming you're using next-auth

const fetchReferralsToken = async () => {
  try {
    const response = await fetch("/api/user/referrals-token", {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", errorText);
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(`API error: ${errorJson.error || response.statusText}`);
      } catch (e) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
    }

    const data = await response.json();

    return data.publicToken;
  } catch (error) {
    console.error("Error fetching referrals token:", error);
    return null;
  }
};

export default function ReferralsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getToken = async () => {
      try {
        const publicToken = await fetchReferralsToken();
        setToken(publicToken);
      } catch (err) {
        console.error("Error fetching referrals token:", err);
      } finally {
        setLoading(false);
      }
    };

    getToken();
  }, []);

  if (loading || !token) {
    return (
      <SkeletonContainer className="mx-auto max-w-4xl">
        <div className="rounded-md p-8">
          <div className="mb-2 flex items-center">
            <SkeletonText className="h-5 w-32" />
          </div>

          <div className="mb-6 space-y-2">
            <SkeletonText className="h-7 w-3/4" />
            <SkeletonText className="h-7 w-1/2" />
          </div>

          <div className="mb-6">
            <SkeletonText className="mb-2 h-5 w-24" />
            <div className="flex items-center space-x-2">
              <SkeletonText className="h-10 w-full rounded-md" />
              <SkeletonButton className="h-10 w-28 rounded-md" />
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4 p-4">
          <div className="col-span-1">
            <div className="mb-4 grid grid-cols-3 gap-2 p-4">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="flex justify-center">
                  <SkeletonAvatar className="h-10 w-10 rounded-md" />
                </div>
              ))}
            </div>
            <div className="px-4 pb-4">
              <SkeletonText className="mb-2 h-6 w-full" />
              <SkeletonButton className="h-10 w-full rounded-md" />
            </div>
          </div>

          <div className="col-span-1">
            <div className="mb-[60px] flex justify-center p-4 md:mb-10">
              <SkeletonAvatar className="mt-10 h-16 w-16 rounded-full md:mt-7 md:h-24 md:w-24" />
            </div>
            <div className="px-4 pb-4">
              <SkeletonText className="mb-2 h-6 w-full" />
              <SkeletonButton className="h-10 w-full rounded-md" />
            </div>
          </div>

          <div className="col-span-1">
            <div className="mb-[60px] flex justify-center p-4 md:mb-10">
              <SkeletonAvatar className="mt-10 h-16 w-16 rounded-md md:mt-7 md:h-24 md:w-24" />
            </div>
            <div className="px-4 pb-4">
              <SkeletonText className="mb-2 h-6 w-full" />
              <SkeletonButton className="h-10 w-full rounded-md" />
            </div>
          </div>
        </div>
      </SkeletonContainer>
    );
  }

  return <ReferralClient publicToken={token} />;
}
