import { useState } from "react";

import { classNames } from "@calcom/lib";

import type { AtomsGlobalConfigProps } from "../types";
import type { ConnectButtonProps } from "../types";

// TODO: add default styling

// we accept two props: buttonText & onButtonClick
// buttonText is for displaying buttonText
// onButtonClick is a a method to handle onClick for button
// it accepts another object which contains a callback in case of any error

export function ConnectButton({
  buttonText,
  onButtonClick,
  stylesClassname,
}: ConnectButtonProps & AtomsGlobalConfigProps) {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errMsg, setErrMsg] = useState<string>("");

  function handleSubmit(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.preventDefault();

    setIsProcessing(true);
    onButtonClick({
      cb: (err) => {
        setIsProcessing(false);
        if (err?.error.message) {
          setErrMsg(err.error.message);
        }
      },
    });
  }

  return (
    <div>
      <button
        className={classNames(
          stylesClassname
            ? `bg-default dark:bg-muted rounded-md ${stylesClassname}`
            : `bg-default dark:bg-muted text-default dark:text-muted rounded-md`
        )}
        onClick={(event) => handleSubmit(event)}
        disabled={!isProcessing}
        type="button">
        {buttonText || "Install App"}
      </button>
      {!!errMsg && <span>{errMsg}</span>}
    </div>
  );
}
