import { cn } from "@/lib/utils";
import { useState } from "react";
import * as React from "react";

import { Button } from "../src/components/ui/button";
import type { AtomsGlobalConfigProps } from "../types";

// we accept two props: buttonText & onButtonClick
// buttonText is for displaying buttonText
// onButtonClick is a a method to handle onClick for button
// it accepts another object which contains a callback in case of any error

interface ConnectButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  buttonText?: string;
  icon?: JSX.Element;
  handleClick: () => void;
  onSuccess?: () => void;
  onError: () => void;
}

export function ConnectButton({
  buttonText,
  handleClick,
  onSuccess,
  onError,
  className,
  icon,
}: ConnectButtonProps & AtomsGlobalConfigProps) {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errMsg, setErrMsg] = useState<string>("");

  function handleSubmit(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.preventDefault();

    try {
      setIsProcessing(true);
      setIsSuccess(true);
      handleClick();
    } catch (error) {
      setIsProcessing(false);
      setIsSuccess(false);
      onError();
      setErrMsg(error?.message);
    }

    setIsProcessing(false);

    // if user wants to handle onSuccess inside handleClick then it makes no sense to have a separate handler
    // otherwise only if the user explicitly passes an onSuccess handler this gets triggered
    if (isSuccess && onSuccess) {
      onSuccess();
    }
  }

  return (
    <div>
      <Button
        className={cn(
          "bg-default text-default dark:text-muted dark:bg-muted relative inline-flex h-9 items-center whitespace-nowrap rounded-md px-4 py-2.5 text-sm font-medium !shadow-none transition-colors disabled:cursor-not-allowed",
          className
            ? className
            : "bg-default text-default dark:text-muted dark:bg-muted relative inline-flex h-9 items-center whitespace-nowrap rounded-md px-4 py-2.5 text-sm font-medium !shadow-none transition-colors disabled:cursor-not-allowed"
        )}
        type="button"
        disabled={!isProcessing}
        onClick={(event) => handleSubmit(event)}>
        {!!icon && icon}
        {buttonText || "Install App"}
      </Button>
      {!!errMsg && <span>{errMsg}</span>}
    </div>
  );
}
