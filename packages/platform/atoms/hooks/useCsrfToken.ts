import { getCsrfToken } from "next-auth/react";
import { useEffect, useState } from "react";

/** Fetches csrfToken to be used in a protected form */
export function useCsrfToken() {
  const [csrfToken, setCsrfToken] = useState("");
  useEffect(() => {
    async function fetchCsrfToken() {
      const csrfToken = await getCsrfToken();
      setCsrfToken(csrfToken || "");
    }
    fetchCsrfToken();
  }, []);
  return csrfToken;
}
