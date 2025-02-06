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
      onFailure();
    }
  };

  const resetCopyStatus = () => {
    setIsCopied(false);
  };

  /** @see https://wolfgangrittner.dev/how-to-use-clipboard-api-in-safari/ */
  const fetchAndCopyToClipboard = (
    promise: Promise<string>,
    options: { onSuccess?: () => void; onFailure?: () => void } = {}
  ) => {
    const { onSuccess = noop, onFailure = noop } = options;
    if (typeof ClipboardItem && navigator.clipboard?.write) {
      // NOTE: Safari locks down the clipboard API to only work when triggered
      //   by a direct user interaction. You can't use it async in a promise.
      //   But! You can wrap the promise in a ClipboardItem, and give that to
      //   the clipboard API.
      //   Found this on https://developer.apple.com/forums/thread/691873
      const text = new ClipboardItem({
        "text/plain": promise
          .then((text) => new Blob([text], { type: "text/plain" }))
          .catch(() => {
            onFailure();
            return "";
          }),
      });
      navigator.clipboard.write([text]);
      onSuccess();
    } else {
      // NOTE: Firefox has support for ClipboardItem and navigator.clipboard.write,
      //   but those are behind `dom.events.asyncClipboard.clipboardItem` preference.
      //   Good news is that other than Safari, Firefox does not care about
      //   Clipboard API being used async in a Promise.
      promise.then((text) => copyToClipboard(text, options)).catch(() => onFailure());
    }
  };

  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(resetCopyStatus, 3000); // Reset copy status after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [isCopied]);

  return { isCopied, copyToClipboard, resetCopyStatus, fetchAndCopyToClipboard };
}
