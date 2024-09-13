import { useEffect, useState } from "react";

export function useCopy() {
  const [isCopied, setIsCopied] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const noop = () => {};

  const copyToClipboard = (
    text: string,
    options: { onSuccess?: () => void; onFailure?: () => void } = {}
  ) => {
    const { onSuccess = noop, onFailure = noop } = options;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setIsCopied(true);
          onSuccess();
        })
        .catch((error) => {
          onFailure();
          console.error("Copy to clipboard failed:", error);
        });
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
