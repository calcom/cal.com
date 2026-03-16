"use client";

import { Button } from "@coss/ui/components/button";
import { Field, FieldDescription, FieldLabel } from "@coss/ui/components/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@coss/ui/components/input-group";
import { anchoredToastManager, toastManager } from "@coss/ui/components/toast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@coss/ui/components/tooltip";
import { useCopyToClipboard } from "@coss/ui/hooks/use-copy-to-clipboard";
import { CheckIcon, ClipboardIcon } from "@coss/ui/icons";
import { cn } from "@coss/ui/lib/utils";
import type * as React from "react";
import { useRef } from "react";

const RESET_DELAY = 2000;

interface CopyableFieldProps {
  label: string;
  value: string;
  monospace?: boolean;
  "aria-label"?: string;
  description?: React.ReactNode;
  copyTooltip?: string;
  copiedTooltip?: string;
  onCopySuccess?: () => void;
  "data-testid"?: string;
}

export function CopyableField({
  label,
  value,
  monospace = false,
  "aria-label": ariaLabel,
  description,
  copyTooltip = "Copy to clipboard",
  copiedTooltip = "Copied!",
  onCopySuccess,
  "data-testid": dataTestId,
}: CopyableFieldProps): React.ReactElement {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { copyToClipboard, isCopied } = useCopyToClipboard({
    onCopy: () => {
      if (buttonRef.current) {
        anchoredToastManager.add({
          data: { tooltipStyle: true },
          positionerProps: { anchor: buttonRef.current },
          timeout: RESET_DELAY,
          title: copiedTooltip,
          type: "success",
        });
      } else {
        toastManager.add({ title: copiedTooltip, type: "success" });
      }
      onCopySuccess?.();
    },
    timeout: RESET_DELAY,
  });

  const handleCopy = () => copyToClipboard(value);

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <InputGroup>
        <InputGroupInput
          aria-label={ariaLabel ?? label}
          className={cn("*:truncate", monospace && "font-mono")}
          data-testid={dataTestId}
          readOnly
          value={value}
        />
        <InputGroupAddon align="inline-end">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  ref={buttonRef}
                  aria-label={`Copy ${label}`}
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                  onClick={handleCopy}
                  disabled={isCopied}
                />
              }>
              {isCopied ? <CheckIcon aria-hidden /> : <ClipboardIcon aria-hidden />}
            </TooltipTrigger>
            <TooltipPopup>
              <p>{isCopied ? copiedTooltip : copyTooltip}</p>
            </TooltipPopup>
          </Tooltip>
        </InputGroupAddon>
      </InputGroup>
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  );
}