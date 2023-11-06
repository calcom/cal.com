import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useState, useCallback } from "react";
import * as React from "react";

import { Button } from "../src/components/ui/button";
import type { AtomsGlobalConfigProps } from "../types";

interface ConnectButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  buttonText?: string;
  icon?: JSX.Element;
  onSuccess?: () => void;
  onError: () => void;
}

export function ConnectButton({
  buttonText,
  onClick,
  onSuccess,
  onError,
  className,
  icon,
}: ConnectButtonProps & AtomsGlobalConfigProps) {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errMsg, setErrMsg] = useState<string>("");

  const handleSubmit = useCallback(
    (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      e.preventDefault();
      setIsProcessing(true);

      try {
        onClick && onClick(e);

        // if user wants to handle onSuccess inside handleClick then it makes no sense to have a separate handler
        // otherwise only if the user explicitly passes an onSuccess handler this gets triggered
        if (onSuccess) {
          onSuccess();
        }
      } catch (error) {
        setIsProcessing(false);
        onError();
        setErrMsg(error?.message);
      }

      setIsProcessing(false);
    },
    [onClick, onSuccess, onError]
  );

  return (
    <div>
      {/* TODO: Button needs a fix width in order to not resize at loading time */}
      <Button
        className={cn(
          "bg-default text-default dark:text-muted dark:bg-muted relative inline-flex h-9 items-center whitespace-nowrap rounded-md px-4 py-2.5 text-sm font-medium !shadow-none transition-colors disabled:cursor-not-allowed",
          className
        )}
        type="button"
        disabled={isProcessing}
        onClick={handleSubmit}>
        {isProcessing ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <>
            {!!icon && icon}
            {buttonText || "Install App"}
          </>
        )}
      </Button>
      {!!errMsg && <span>{errMsg}</span>}
    </div>
  );
}
