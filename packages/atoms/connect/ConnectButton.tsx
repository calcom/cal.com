import { useState } from "react";

import type { AtomsGlobalConfigProps } from "../types";
import type { ConnectButtonProps } from "../types";

// TODO: add default styling
// also a cssClassAssembler function for custom styling

// we accept two props: buttonText & onButtonClick
// buttonText is for displaying buttonText
// onButtonClick is a a method to handle onClick for button
// it accepts another object which contains a callback in case of any error

export function ConnectButton({ buttonText, onButtonClick }: ConnectButtonProps & AtomsGlobalConfigProps) {
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
      <button className="" onClick={(event) => handleSubmit(event)} disabled={!isProcessing} type="button">
        {buttonText || "Install App"}
      </button>
      {!!errMsg && <span>{errMsg}</span>}
    </div>
  );
}
