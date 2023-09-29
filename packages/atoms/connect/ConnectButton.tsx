import { useState } from "react";
import type { ConnectButtonProps } from "types";
import type { AtomsGlobalConfigProps } from "types";

// TODO: add default styling
// also a cssClassAssembler function for custom styling

export function ConnectButton({ buttonText, onButtonClick }: ConnectButtonProps & AtomsGlobalConfigProps) {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errMsg, setErrMsg] = useState<string>("");

  function handleSubmit(e: Event) {
    e.preventDefault();

    setIsProcessing(true);
    onButtonClick();
  }

  return (
    <div>
      <button onClick={(event) => handleSubmit(event)} disabled={!isProcessing} type="button">
        {buttonText || "Install App"}
      </button>
      {!!errMsg ? <span>{errMsg}</span> : null}
    </div>
  );
}
