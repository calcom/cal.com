import { useRouter } from "next/router";
import { useEffect } from "react";

import { useLocalStorage } from "./useLocalStorage";

export const useBullBitcoinParams = (): { redeemCode: string } => {
  const {
    query: { redeemCode },
  } = useRouter();

  const [redeemCodeStored, setRedeemCodeStored] = useLocalStorage("redeemCode", "");

  useEffect(() => {
    if (redeemCode && typeof redeemCode === "string") {
      setRedeemCodeStored(redeemCode);
    }
  }, [redeemCode, setRedeemCodeStored]);

  return {
    redeemCode: redeemCodeStored,
  };
};
