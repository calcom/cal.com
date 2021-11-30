import { useRouter } from "next/router";
import { useEffect } from "react";

import { useLocalStorage } from "./useLocalStorage";

export const useBullBitcoinParams = (): { saleId: string; redeemCode: string } => {
  const {
    query: { saleId, redeemCode },
  } = useRouter();

  const [saleIdStored, setSaleIdStored] = useLocalStorage("saleId", "");
  const [redeemCodeStored, setRedeemCodeStored] = useLocalStorage("redeemCode", "");

  useEffect(() => {
    if (saleId && typeof saleId === "string") {
      setSaleIdStored(saleId);
    }
    if (redeemCode && typeof redeemCode === "string") {
      setRedeemCodeStored(redeemCode);
    }
  }, [saleId, redeemCode, setSaleIdStored, setRedeemCodeStored]);

  return {
    saleId: saleIdStored,
    redeemCode: redeemCodeStored,
  };
};
