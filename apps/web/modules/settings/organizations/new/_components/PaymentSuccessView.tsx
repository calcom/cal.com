"use client";

import { useSession } from "next-auth/react";

import { SkeletonContainer } from "@calcom/ui";

const PaymentSuccessView = () => {
  const session = useSession();

  if (session.status === "loading") {
    return <SkeletonContainer>Loading...</SkeletonContainer>;
  }
  return <> hello</>;
};

export default PaymentSuccessView;
