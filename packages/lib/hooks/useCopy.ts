import { useState, useEffect } from "react";

export function useCopy() {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => setIsCopied(true))
        .catch((error) => console.error("Copy to clipboard failed:", error));
    } else {
      console.warn(
        "You need to use a secure context to use clipboard \n Please use the following link: ",
        text
      );
    }
  };

  const resetCopyStatus = () => {
    setIsCopied(false);
  };

  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(resetCopyStatus, 3000); // Reset copy status after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [isCopied]);

  return { isCopied, copyToClipboard, resetCopyStatus };
}
